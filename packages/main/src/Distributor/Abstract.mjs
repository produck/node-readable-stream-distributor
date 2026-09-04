import * as os from 'node:os';

import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _S } from './Symbol.mjs';
import { NonNegativeInteger } from './Parser.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';

class ReadableStreamDistributor extends EventTarget {
  [I.SOURCE_READER] = null;
  [I.BUFFER_STASH] = new ChunkStash.Concrete();
  [I.DESTROYED] = false;
  [I.PULLING] = null;
  [I.SOURCE_DONE] = false;
  [I.SOURCE_ERROR] = null;
  [I.TOTAL_CHUNKS] = 0;
  [$I.REGISTRY] = new Set();

  static [_S.HIGH_WATER_MARK]() {
    return os.freemem();
  }

  static get highWaterMark() {
    return this[_S.HIGH_WATER_MARK]();
  }

  constructor(source) {
    super();

    if (source.locked) {
      throw new Error('Source stream must not be locked');
    }

    this[I.CONSTRUCTOR] = new.target;
    this[I.SOURCE] = source;
  }

  get highWaterMark() {
    return this[I.CONSTRUCTOR].highWaterMark;
  }

  get degraded() {
    return this[I.BUFFER_STASH].dropped;
  }

  fork(options) {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('options must be an object');
    }

    if (typeof options.label !== 'string') {
      throw new TypeError('options.label must be a string');
    }

    if (this[I.DESTROYED]) {
      throw new Error('Distributor has been destroyed');
    }

    const forked = new ForkedReadableStream.Concrete(this, options.label);

    this[$I.REGISTRY].add(forked);
    this.dispatchEvent(new Event('fork'));

    return forked;
  }

  destroy() {
    this[I.DESTROYED] = true;
    this.dispatchEvent(new Event('destroy'));

    // TODO: stop pulling, error copies after drain, release source reader
    throw new Error('Not implemented');
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.HIGH_WATER_MARK]: M.Method().returns(NonNegativeInteger),
  }),
);
