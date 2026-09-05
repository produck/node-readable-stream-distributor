import * as os from 'node:os';

import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';
import * as SourceReader from './SourceReader/index.mjs';
import { isReadableStreamLike } from './Checker.mjs';
import { I, $I, _S } from './Symbol.mjs';
import { NonNegativeInteger } from './Parser.mjs';

class ReadableStreamDistributor extends EventTarget {
  [I.BUFFER_STASH] = new ChunkStash.Concrete();
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

    if (source.locked) {
      Ow.Error.Common('Source stream must not be locked');
    }

    this[I.CONSTRUCTOR] = new.target;
    this[I.SOURCE_READER] = new SourceReader.Concrete(source);
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
      Ow.Error.Common('Distributor has been destroyed');
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
    Ow.Error.Common('Not implemented');
  }
}

export default Abstract(
  ReadableStreamDistributor,
  Abstract.Static({
    [_S.HIGH_WATER_MARK]: M.Method().returns(NonNegativeInteger),
  }),
);
