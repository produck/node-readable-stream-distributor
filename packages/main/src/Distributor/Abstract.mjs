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
import * as Options from './Options/index.mjs';
import { I, $I, _S, A } from './_Symbol.mjs';
import { _A, TRANSFERRER } from './_External.mjs';

const TERMINATION_MESSAGE = 'The distributor has been terminated';

class ReadableStreamDistributor extends EventTarget {
  [A.I.STASH] = new ChunkStash.Concrete();
  [A.$I.REGISTRY] = new ForkedReadableStreamRegistry();
  [$I.TERMINATION] = null;
  [I.TRANSFERRER_ARGS] = [];
  [$I.TRANSFERRER] = null;
  [$I.DESTROYED] = null;
  [A.I.CTOR.READER.CURRENT] = BufferChunkReader.Concrete;

  constructor(source) {
    super();

    if (!Checker.isReadableStreamLike(source)) {
      ThrowTypeError('source', 'a WHATWG ReadableStream');
    }

    Options.install(this);

    this[I.CTOR] = new.target;
    this[A.I.SOURCE] = new SourceReader.Concrete(source);
    this[A.I.AGENT] = new SourceConsumptionAgent(this);
  }

  get options() {
    return Options.getOptionsSnapshot(this);
  }

  get degraded() {
    return this[$I.TRANSFERRER] !== null;
  }

  get terminated() {
    return this[$I.TERMINATION] !== null;
  }

  async [I.INITIALIZE_READER](reader, progress) {
    try {
      await reader[_A.DEGRADED.$I.REQUEST_INITIALIZE](progress);
    } catch (cause) {
      this.dispatchEvent(new Event.Warn('initialize-failed', cause));
    }
  }

  fork() {
    if (this.terminated) {
      Ow.Error.Common('Distributor has been terminated');
    }

    const agent = this[A.I.AGENT];
    const stash = this[A.I.STASH];
    const transferrer = this[$I.TRANSFERRER];
    const ChunkReaderImpl = this[A.I.CTOR.READER.CURRENT];
    const reader = new ChunkReaderImpl(agent, stash, transferrer);

    if (ChunkReaderImpl === this[A.I.CTOR.READER.DEGRADED]) {
      this[I.INITIALIZE_READER](reader, 0);
    }

    const forked = new ForkedReadableStream.Concrete(this, reader);

    // TODO: review the listener failure here: dispatchEvent never throws, so a
    //   throwing fork listener becomes an uncaughtException (measured) while
    //   fork() still answers with the copy.
    this.dispatchEvent(new Event.Fork(forked));

    return forked;
  }

  [$I.DEGRADE]() {
    const {
      [A.I.CTOR.READER.DEGRADED]: DegradedChunkReaderImpl,
      [A.I.CTOR.TRANSFERRER]: TransferrerImpl,
    } = this;

    const agent = this[A.I.AGENT];
    const stash = this[A.I.STASH];
    const { byteLength } = stash;
    const transferrer = new TransferrerImpl(...this[I.TRANSFERRER_ARGS]);

    if (stash.done) {
      transferrer[TRANSFERRER.$I.SET_DONE]();
    }

    // TODO: review this pair: the dump failure is only warned, and a throwing
    //   warn listener becomes an uncaughtException (measured), not a rejection.
    transferrer[TRANSFERRER.$I.DUMP](stash).catch((cause) => {
      this.dispatchEvent(new Event.Warn('dump-failed', cause));
    });

    this[$I.TRANSFERRER] = transferrer;
    this[A.I.CTOR.READER.CURRENT] = DegradedChunkReaderImpl;

    for (const [forked] of this[A.$I.REGISTRY]) {
      const reader = new DegradedChunkReaderImpl(agent, stash, transferrer);
      const bufferChunkReader = forked[_A.FORKED.A.$I.READER];
      const progress = bufferChunkReader[_A.READER.A.$I.CONSUMED_COUNT];

      this[I.INITIALIZE_READER](reader, progress);
      bufferChunkReader[_A.BUFFER.$I.HANDOVER](reader);
      forked[_A.FORKED.$I.SET_DEGRADED_CHUNK_READER](reader);
    }

    this.dispatchEvent(new Event.Degrade(byteLength));
  }

  setTransferrerArgs(...args) {
    if (this.degraded) {
      Ow.Error.Common('Transferrer args have been consumed');
    }

    const { [A.I.CTOR.TRANSFERRER]: TransferrerImpl } = this;
    const parsed = TransferrerImpl[TRANSFERRER._S.PARSE_ARGUMENTS](args);

    this[I.TRANSFERRER_ARGS] = parsed;
  }

  get [A.I.CTOR.READER.DEGRADED]() {
    return this[I.CTOR][_S.DEGRADED_CHUNK_READER_CTOR];
  }

  get [A.I.CTOR.TRANSFERRER]() {
    return this[A.I.CTOR.READER.DEGRADED][_A.DEGRADED._S.TRANSFERRER_CTOR];
  }

  terminate() {
    if (this.terminated) {
      return;
    }

    this[$I.TERMINATION] = new DOMException(TERMINATION_MESSAGE, 'AbortError');
    // TODO: review a terminate listener that throws: dispatchEvent never
    //   throws, so it becomes an uncaughtException (measured).
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

    // TODO: review this pair: the cancel failure is only warned, and a throwing
    //   warn listener becomes an uncaughtException (measured), not a rejection.
    await this[A.I.SOURCE].cancel(termination).catch((cause) => {
      this.dispatchEvent(new Event.Warn('source-cancel-failed', cause));
    });

    // TODO: review what is discarded here: the in-flight pull may carry a
    //   source error, a host write failure or a latched medium error.
    await Promise.resolve(this[A.I.AGENT].pulling).catch(() => {});

    const transferrer = this[$I.TRANSFERRER];
    const stash = this[A.I.STASH];

    if (transferrer === null) {
      stash[_A.STASH.$I.SET_DONE]();
      stash[_A.STASH.$I.DROP]();
    } else {
      transferrer[TRANSFERRER.$I.SET_DONE]();

      transferrer[TRANSFERRER.$I.DROP]().catch(() => {
        // TODO dispatch warn
      });
    }
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.DEGRADED_CHUNK_READER_CTOR]: M.Function,
  }),
);
