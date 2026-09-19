import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as BufferChunkReader from './BufferChunkReader/index.mjs';
import * as DegradedChunkReader from './DegradedChunkReader/index.mjs';
import * as Event from './Event.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkReader from './ChunkReader/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';
import * as SourceReader from './SourceReader/index.mjs';
import SourceConsumptionAgent from './SourceConsumptionAgent.mjs';
import ForkedReadableStreamRegistry from './ForkedReadableStreamRegistry.mjs';
import { isReadableStreamLike } from './Checker.mjs';
import { I, $I, _S } from './Symbol.mjs';
import * as Parser from './Parser.mjs';

const { Transferrer } = DegradedChunkReader;

class ReadableStreamDistributor extends EventTarget {
  [I.CHUNK_STASH] = new ChunkStash.Concrete();
  [I.CURRENT_CHUNK_READER_CTOR] = BufferChunkReader.Concrete;
  [$I.TERMINATION] = null;
  [$I.STASH_BYTE_LIMIT];
  [I.TRANSFERRER_ARGS] = [];
  [$I.TRANSFERRER] = null;
  [$I.FORKED_READABLE_STREAM_REGISTRY] = new ForkedReadableStreamRegistry();

  constructor(source, stashByteLimit = 1024 ** 3) {
    super();

    if (!isReadableStreamLike(source)) {
      ThrowTypeError('source', 'a WHATWG ReadableStream');
    }

    this[$I.STASH_BYTE_LIMIT] = Parser.NonNegativeInteger(stashByteLimit);
    this[I.CTOR] = new.target;
    this[I.SOURCE_READER] = new SourceReader.Concrete(source);
    this[I.SOURCE_CONSUMPTION_AGENT] = new SourceConsumptionAgent(this);
  }

  get degraded() {
    return this[I.SOURCE_CONSUMPTION_AGENT].degraded;
  }

  get terminated() {
    return this[$I.TERMINATION] !== null;
  }

  fork(label = '<UNDEFINED>') {
    if (typeof label !== 'string') {
      ThrowTypeError('label', 'a string');
    }

    if (this.terminated) {
      Ow.Error.Common('Distributor has been terminated');
    }

    const agent = this[I.SOURCE_CONSUMPTION_AGENT];
    const stash = this[I.CHUNK_STASH];
    const transferrer = this[$I.TRANSFERRER];
    const registry = this[$I.FORKED_READABLE_STREAM_REGISTRY];
    const ChunkReaderImpl = this[I.CURRENT_CHUNK_READER_CTOR];
    const chunkReader = new ChunkReaderImpl(agent, stash, transferrer);

    if (ChunkReaderImpl === this[I.DEGRADED_CHUNK_READER_CTOR]) {
      chunkReader[DegradedChunkReader.$I.REQUEST_INITIALIZE](0);
    }

    const forked = new ForkedReadableStream.Concrete(this, chunkReader, label);

    registry.add(forked);
    this.dispatchEvent(new Event.Fork(forked));

    return forked;
  }

  [$I.SET_TRANSFERRER_ARGS](...args) {
    if (this[$I.TRANSFERRER] !== null) {
      Ow.Error.Common('Transferrer args have been consumed');
    }

    //TODO check args
    this[I.TRANSFERRER_ARGS] = args;
  }

  get [I.DEGRADED_CHUNK_READER_CTOR]() {
    return this[I.CTOR][_S.DEGRADED_CHUNK_READER_CTOR];
  }

  get [I.TRANSFERRER_CTOR]() {
    const DegradedChunkReaderImpl = this[I.DEGRADED_CHUNK_READER_CTOR];

    return DegradedChunkReaderImpl[DegradedChunkReader._S.TRANSFERRER_CTOR];
  }

  [$I.DEGRADE]() {
    const {
      [I.DEGRADED_CHUNK_READER_CTOR]: DegradedChunkReaderImpl,
      [I.TRANSFERRER_CTOR]: TransferrerImpl,
    } = this;

    const agent = this[I.SOURCE_CONSUMPTION_AGENT];
    const stash = this[I.CHUNK_STASH];
    const transferrer = new TransferrerImpl(...this[I.TRANSFERRER_ARGS]);

    transferrer[Transferrer.$I.DUMP](stash).catch((cause) => {
      this.dispatchEvent(new Event.Warn('dump-failed', cause));
    });

    this[$I.TRANSFERRER] = transferrer;
    this[I.CURRENT_CHUNK_READER_CTOR] = DegradedChunkReaderImpl;

    for (const forked of this[$I.FORKED_READABLE_STREAM_REGISTRY]) {
      const reader = new DegradedChunkReaderImpl(agent, stash, transferrer);
      const bufferChunkReader = forked[ForkedReadableStream.$I.CHUNK_READER];
      const progress = bufferChunkReader[ChunkReader.$I.CONSUMED_CHUNK_COUNT];

      reader[DegradedChunkReader.$I.REQUEST_INITIALIZE](progress);
      bufferChunkReader[BufferChunkReader.$I.HANDOVER](reader);
      forked[ForkedReadableStream.$I.SET_DEGRADED_CHUNK_READER](reader);
    }
  }

  terminate() {
    if (this.terminated) {
      return;
    }

    const message = 'The distributor has been terminated';
    const termination = new DOMException(message, 'AbortError');

    this[$I.TERMINATION] = termination;
    this.dispatchEvent(new Event.Terminate());
  }

  destroy() {
    this.terminate();

    const transferrer = this[$I.TRANSFERRER];

    if (transferrer === null) {
      this[I.CHUNK_STASH][ChunkStash.$I.SET_DONE]();
    } else {
      transferrer[Transferrer.$I.SET_DONE]();
    }

    this[I.SOURCE_READER].cancel(this[$I.TERMINATION]).catch((cause) => {
      this.dispatchEvent(new Event.Warn('source-cancel-failed', cause));
    });

    // TODO: release the stash and the medium once the last copy has ended
    //   (reference counting); the write side has no close/release member yet.
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.DEGRADED_CHUNK_READER_CTOR]: M.Function,
  }),
);
