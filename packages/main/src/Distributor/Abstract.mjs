import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as BufferChunkReader from './BufferChunkReader/index.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';
import * as SourceReader from './SourceReader/index.mjs';

import SourceConsumptionAgent from './SourceConsumptionAgent.mjs';
import ForkedReadableStreamRegistry from './ForkedReadableStreamRegistry.mjs';
import * as Checker from './Checker.mjs';
import * as Event from './Event.mjs';
import * as Parser from './Parser.mjs';
import { I, $I, _S, A } from './_Symbol.mjs';
import { _A, TRANSFERRER } from './_External.mjs';

const TERMINATION_MESSAGE = 'The distributor has been terminated';

class ReadableStreamDistributor extends EventTarget {
  [A.I.STASH] = new ChunkStash.Concrete();
  [A.$I.REGISTRY] = new ForkedReadableStreamRegistry();
  [$I.TERMINATION] = null;
  [A.$I.LIMIT] = 0;
  [I.TRANSFERRER_ARGS] = [];
  [$I.TRANSFERRER] = null;
  [$I.DESTROYED] = null;
  [A.I.CTOR.READER.CURRENT] = BufferChunkReader.Concrete;

  constructor(source, limit = 1024 ** 3) {
    super();

    if (!Checker.isReadableStreamLike(source)) {
      ThrowTypeError('source', 'a WHATWG ReadableStream');
    }

    this[I.CTOR] = new.target;
    this[A.$I.LIMIT] = Parser.NonNegativeInteger(limit);
    this[A.I.SOURCE] = new SourceReader.Concrete(source);
    this[A.I.AGENT] = new SourceConsumptionAgent(this);
  }

  get degraded() {
    return this[$I.TRANSFERRER] !== null;
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

    const agent = this[A.I.AGENT];
    const stash = this[A.I.STASH];
    const transferrer = this[$I.TRANSFERRER];
    const ChunkReaderImpl = this[A.I.CTOR.READER.CURRENT];
    const reader = new ChunkReaderImpl(agent, stash, transferrer);

    if (ChunkReaderImpl === this[A.I.CTOR.READER.DEGRADED]) {
      reader[_A.DEGRADED.$I.REQUEST_INITIALIZE](0);
    }

    const forked = new ForkedReadableStream.Concrete(this, reader, label);

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

  get [A.I.CTOR.READER.DEGRADED]() {
    return this[I.CTOR][_S.DEGRADED_CHUNK_READER_CTOR];
  }

  get [A.I.CTOR.TRANSFERRER]() {
    return this[A.I.CTOR.READER.DEGRADED][_A.DEGRADED._S.TRANSFERRER_CTOR];
  }

  [$I.DEGRADE]() {
    const {
      [A.I.CTOR.READER.DEGRADED]: DegradedChunkReaderImpl,
      [A.I.CTOR.TRANSFERRER]: TransferrerImpl,
    } = this;

    const agent = this[A.I.AGENT];
    const stash = this[A.I.STASH];
    const transferrer = new TransferrerImpl(...this[I.TRANSFERRER_ARGS]);

    // TODO: the edge policy - "past the limit and the source already ended"
    //   switches today, as a consequence of the probe running on every pull;
    //   make it a declaration the host can set (an _S entry or a protected
    //   member) once a second value has a user.
    if (stash.done) {
      transferrer[TRANSFERRER.$I.SET_DONE]();
    }

    transferrer[TRANSFERRER.$I.DUMP](stash).catch((cause) => {
      this.dispatchEvent(new Event.Warn('dump-failed', cause));
    });

    this[$I.TRANSFERRER] = transferrer;
    this[A.I.CTOR.READER.CURRENT] = DegradedChunkReaderImpl;

    for (const [forked] of this[A.$I.REGISTRY]) {
      const reader = new DegradedChunkReaderImpl(agent, stash, transferrer);
      const bufferChunkReader = forked[_A.FORKED.A.$I.READER];
      const progress = bufferChunkReader[_A.READER.A.$I.CONSUMED_COUNT];

      reader[_A.DEGRADED.$I.REQUEST_INITIALIZE](progress);
      bufferChunkReader[_A.BUFFER.$I.HANDOVER](reader);
      forked[_A.FORKED.$I.SET_DEGRADED_CHUNK_READER](reader);
    }
  }

  terminate() {
    if (this.terminated) {
      return;
    }

    this[$I.TERMINATION] = new DOMException(TERMINATION_MESSAGE, 'AbortError');
    this.dispatchEvent(new Event.Terminate());
  }

  destroy() {
    if (this[$I.DESTROYED] === null) {
      this[$I.DESTROYED] = this[$I.DESTROY]();
    }

    return this[$I.DESTROYED];
  }

  async [$I.DESTROY]() {
    this.terminate();

    const registry = this[A.$I.REGISTRY];
    const termination = this[$I.TERMINATION];

    for (const [forked, controller] of registry) {
      forked[_A.FORKED.A.$I.READER][_A.READER.$I.CLOSE]();
      controller.error(termination);
      registry.prune(forked);
    }

    await this[A.I.SOURCE].cancel(termination).catch((cause) => {
      this.dispatchEvent(new Event.Warn('source-cancel-failed', cause));
    });

    await Promise.resolve(this[A.I.AGENT].pulling).catch(() => {});

    const transferrer = this[$I.TRANSFERRER];
    const stash = this[A.I.STASH];

    if (transferrer === null) {
      stash[_A.STASH.$I.SET_DONE]();
      stash[_A.STASH.$I.DROP]();
    } else {
      transferrer[TRANSFERRER.$I.SET_DONE]();
      transferrer[TRANSFERRER.$I.DROP]();
    }
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.DEGRADED_CHUNK_READER_CTOR]: M.Function,
  }),
);
