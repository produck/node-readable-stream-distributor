// TODO: remove at repo wrap-up — a platform-neutral base must not import
//   node:os; the default limit belongs to a Node-specific subclass.
import * as os from 'node:os';

import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as BufferChunkReader from './BufferChunkReader/index.mjs';
import * as DegradedChunkReader from './DegradedChunkReader/index.mjs';
import * as Event from './Event.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';
import * as SourceReader from './SourceReader/index.mjs';
import SourceConsumptionAgent from './SourceConsumptionAgent.mjs';
import { isReadableStreamLike } from './Checker.mjs';
import { I, $I, _S } from './Symbol.mjs';
import { NonNegativeInteger } from './Parser.mjs';

const { Transferrer } = DegradedChunkReader;

class ReadableStreamDistributor extends EventTarget {
  [I.CHUNK_STASH] = new ChunkStash.Concrete();
  [I.CURRENT_CHUNK_READER_CTOR] = BufferChunkReader.Concrete;
  [I.DESTROYED] = false;
  [I.TRANSFERRER_ARGS] = [];
  [$I.TRANSFERRER] = null;
  [$I.REGISTRY] = new Set();

  static [_S.STASH_BYTE_LIMIT]() {
    return os.freemem();
  }

  static get stashByteLimit() {
    return this[_S.STASH_BYTE_LIMIT]();
  }

  constructor(source) {
    super();

    if (!isReadableStreamLike(source)) {
      ThrowTypeError('source', 'a WHATWG ReadableStream');
    }

    this[I.CTOR] = new.target;
    this[I.SOURCE_READER] = new SourceReader.Concrete(source);
    this[I.SOURCE_CONSUMPTION_AGENT] = new SourceConsumptionAgent(this);
  }

  get stashByteLimit() {
    return this[I.CTOR].stashByteLimit;
  }

  get degraded() {
    return this[I.SOURCE_CONSUMPTION_AGENT].degraded;
  }

  fork(label = '<UNDEFINED>') {
    if (typeof label !== 'string') {
      ThrowTypeError('label', 'a string');
    }

    if (this[I.DESTROYED]) {
      Ow.Error.Common('Distributor has been destroyed');
    }

    const agent = this[I.SOURCE_CONSUMPTION_AGENT];
    const stash = this[I.CHUNK_STASH];
    const transferrer = this[$I.TRANSFERRER];
    const ChunkReaderImpl = this[I.CURRENT_CHUNK_READER_CTOR];
    const chunkReader = new ChunkReaderImpl(agent, stash, transferrer);

    if (ChunkReaderImpl === this[I.DEGRADED_CHUNK_READER_CTOR]) {
      chunkReader[DegradedChunkReader.$I.REQUEST_INITIALIZE](0);
    }

    const forked = new ForkedReadableStream.Concrete(this, chunkReader, label);

    this[$I.REGISTRY].add(forked);
    this.dispatchEvent(new Event.Fork(forked));

    return forked;
  }

  // TODO: nothing calls this yet — the trigger (cancel notification vs fork /
  //   destroy) is TBD.
  [$I.PRUNE]() {
    for (const forked of this[$I.REGISTRY]) {
      if (forked[ForkedReadableStream.$I.CANCELLED]) {
        this[$I.REGISTRY].delete(forked);
      }
    }
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

    for (const forked of this[$I.REGISTRY]) {
      const reader = new DegradedChunkReaderImpl(agent, stash, transferrer);
      const bufferChunkReader = forked[ForkedReadableStream.$I.CHUNK_READER];
      const progress = bufferChunkReader.consumedChunkCount;

      reader[DegradedChunkReader.$I.REQUEST_INITIALIZE](progress);
      bufferChunkReader[BufferChunkReader.$I.HANDOVER](reader);
      forked[ForkedReadableStream.$I.SET_DEGRADED_CHUNK_READER](reader);
    }
  }

  destroy() {
    this[I.DESTROYED] = true;
    this.dispatchEvent(new Event.Destroy());

    // TODO: stop pulling, error live forks after drain (via their controllers)
    //   and prune the registry, release the source reader
    Ow.Error.Common('Not implemented');
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.STASH_BYTE_LIMIT]: M.Method().returns(NonNegativeInteger),
    [_S.DEGRADED_CHUNK_READER_CTOR]: M.Function,
  }),
);
