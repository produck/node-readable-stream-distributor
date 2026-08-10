import * as os from 'node:os';

import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _S } from './Symbol.mjs';
import { NonNegativeInteger, AbsolutePath } from './Parser.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';

class ReadableStreamDistributor extends EventTarget {
  [I.READER] = null;
  [I.BUFFER] = [];
  [I.BUFFER_SIZE] = 0;
  [$I.COPIES] = new Set();
  [I.FILE_HANDLE] = null;
  [I.TMPFILE_PATH] = null;
  [I.COMMITTED_CHUNKS] = 0;
  [I.IN_FILE_PHASE] = false;
  [I.DESTROYED] = false;
  [I.PULLING] = null;
  [I.SOURCE_DONE] = false;
  [I.SOURCE_ERROR] = null;
  [I.TOTAL_CHUNKS] = 0;

  static [_S.HIGH_WATER_MARK]() {
    return os.freemem();
  }

  static [_S.TMPDIR]() {
    return process.env.TMPDIR || os.tmpdir();
  }

  static highWaterMark() {
    return this[_S.HIGH_WATER_MARK]();
  }

  static tmpdir() {
    return this[_S.TMPDIR]();
  }

  /** @param {ReadableStream} source — must be unlocked */
  constructor(source) {
    super();

    if (source.locked) {
      throw new Error('Source stream must not be locked');
    }

    this[I.CONSTRUCTOR] = new.target;
    this[I.SOURCE] = source;
  }

  get highWaterMark() {
    return this[I.CONSTRUCTOR].highWaterMark();
  }

  get tmpdir() {
    return this[I.CONSTRUCTOR].tmpdir();
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

    const copy = new ForkedReadableStream.Final(this, options.label);

    this[$I.COPIES].add(copy);
    this.dispatchEvent(new Event('fork'));

    return copy;
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
    [_S.TMPDIR]: M.Method().returns(AbsolutePath),
    [_S.HIGH_WATER_MARK]: M.Method().returns(NonNegativeInteger),
  }),
);
