import * as os from 'node:os';

import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';
import { isReadableStreamLike } from './Checker.mjs';
import { I, $I, _S } from './Symbol.mjs';
import { NonNegativeInteger } from './Parser.mjs';

class ReadableStreamDistributor extends EventTarget {
  [I.SOURCE_READER] = null;
  [I.BUFFER_STASH] = new ChunkStash.Concrete();
  [I.DESTROYED] = false;
  [I.PULLING] = null;
  [I.SOURCE_DONE] = false;
  [I.SOURCE_ERROR] = null;

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
      ThrowTypeError('options', 'an object');
    }

    if (typeof options.label !== 'string') {
      ThrowTypeError('options.label', 'a string');
    }

    if (this[I.DESTROYED]) {
      throw new Error('Distributor has been destroyed');
    }

    const forked = new ForkedReadableStream.Concrete(this, options.label);

    this[$I.REGISTRY].add(forked);
    this.dispatchEvent(new Event('fork'));

    return forked;
  }

  [$I.PRUNE]() {
    for (const forked of this[$I.REGISTRY]) {
      if (forked[ForkedReadableStream.$I.CANCELLED]) {
        this[$I.REGISTRY].delete(forked);
      }
    }
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
