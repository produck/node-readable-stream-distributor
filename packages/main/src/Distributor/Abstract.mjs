import * as os from 'node:os';

import { IDistributor as I } from './Symbol.mjs';
import * as ForkedReadableStream from './ForkedReadableStream/index.mjs';

export default class ReadableStreamDistributor {
  static highWaterMark() {
    return os.freemem();
  }

  static tmpdir() {
    return process.env.TMPDIR || os.tmpdir();
  }

  /** @param {ReadableStream} source — must be unlocked */
  constructor(source) {
    if (source.locked) {
      throw new Error('Source stream must not be locked');
    }

    this[I.CONSTRUCTOR] = new.target;
    this[I.SOURCE] = source;
    this[I.READER] = null;
    this[I.BUFFER] = [];
    this[I.BUFFER_SIZE] = 0;
    this[I.COPIES] = new Set();
    this[I.FILE_HANDLE] = null;
    this[I.TMPFILE_PATH] = null;
    this[I.COMMITTED_CHUNKS] = 0;
    this[I.IN_FILE_PHASE] = false;
    this[I.DESTROYED] = false;
    this[I.PULLING] = null;
    this[I.SOURCE_DONE] = false;
    this[I.SOURCE_ERROR] = null;
    this[I.TOTAL_CHUNKS] = 0;
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

    const copy = new ForkedReadableStream.Final({
      label: options.label,
      distributor: this,
    });

    this[I.COPIES].add(copy);

    // TODO: create underlying ReadableStream and assign to copy[I.STREAM]
    // copy[I.STREAM] = new ReadableStream({
    //   pull: async (controller) => { ... },
    //   cancel: () => { copy.unregister(); },
    // });

    return copy;
  }

  destroy() {
    // TODO: implement
    throw new Error('Not implemented');
  }
}
