import * as os from 'node:os';

import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import { BufferChunkReader } from './BufferChunkReader.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';
import * as SourceReader from './SourceReader/index.mjs';
import SourceConsumptionAgent from './SourceConsumptionAgent.mjs';
import { isReadableStreamLike } from './Checker.mjs';
import { I, $I, _S } from './Symbol.mjs';
import { NonNegativeInteger } from './Parser.mjs';

class ReadableStreamDistributor extends EventTarget {
  [I.CHUNK_STASH] = new ChunkStash.Concrete();
  [I.DESTROYED] = false;
  [$I.REGISTRY] = new Set();

  static [_S.HIGH_WATER_MARK]() {
    return os.freemem();
  }

  static get highWaterMark() {
    return this[_S.HIGH_WATER_MARK]();
  }

  constructor(source) {
    super();

    if (!isReadableStreamLike(source)) {
      ThrowTypeError('source', 'a WHATWG ReadableStream');
    }

    this[I.CONSTRUCTOR] = new.target;
    this[I.SOURCE_READER] = new SourceReader.Concrete(source);
    this[I.SOURCE_CONSUMPTION_AGENT] = new SourceConsumptionAgent(this);
  }

  get highWaterMark() {
    return this[I.CONSTRUCTOR].highWaterMark;
  }

  get degraded() {
    return this[I.CHUNK_STASH].dropped;
  }

  fork(label = '<UNDEFINED>') {
    if (typeof label !== 'string') {
      ThrowTypeError('label', 'a string');
    }

    if (this[I.DESTROYED]) {
      Ow.Error.Common('Distributor has been destroyed');
    }

    const bufferChunkReader = new BufferChunkReader(
      this[I.SOURCE_CONSUMPTION_AGENT],
      this[I.CHUNK_STASH],
    );

    const forked = new ForkedReadableStream.Concrete(
      this,
      bufferChunkReader,
      label,
    );

    this[$I.REGISTRY].add(forked);
    this.dispatchEvent(new Event('fork'));

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

  // TODO: dump the buffer into the switched medium, then swap every fork's
  //   reader, each positioned by its own `consumedChunks`.
  [$I.DEGRADE]() {
    Ow.Error.Common('Not implemented');
  }

  destroy() {
    this[I.DESTROYED] = true;
    this.dispatchEvent(new Event('destroy'));

    // TODO: stop pulling, error live forks after drain (via their controllers)
    //   and prune the registry, release the source reader
    Ow.Error.Common('Not implemented');
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.HIGH_WATER_MARK]: M.Method().returns(NonNegativeInteger),
  }),
);
