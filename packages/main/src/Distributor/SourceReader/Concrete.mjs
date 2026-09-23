import * as Ow from '@produck/ow';

import { I } from './_Symbol.mjs';

export default class SourceReader {
  [I.DONE] = false;
  [I.ERROR] = null;
  [I.CANCELLED] = false;
  [I.READING] = null;

  /** @param {ReadableStream} stream */
  constructor(stream) {
    if (stream.locked) {
      Ow.Error.Common('Source stream must not be locked');
    }

    this[I.STREAM] = stream;
    this[I.READER] = stream.getReader();
  }

  get done() {
    return this[I.DONE];
  }

  get cancelled() {
    return this[I.CANCELLED];
  }

  get finished() {
    return this.done || this.cancelled;
  }

  async [I.READ]() {
    // Guarantee: `pull()` is the only caller of `read()`, and `ensure()`
    //   starts no pull once `finished` (`done || cancelled`) is true — so a
    //   read never starts after a cancel.
    const result = await this[I.READER].read().catch((cause) => {
      if (!this[I.CANCELLED]) {
        this[I.ERROR] = cause;
      }

      throw cause;
    });

    if (!this[I.CANCELLED]) {
      this[I.DONE] = result.done;
    }

    return result;
  }

  read() {
    if (this[I.READING] === null) {
      this[I.READING] = this[I.READ]().finally(() => (this[I.READING] = null));
    }

    return this[I.READING];
  }

  async cancel(reason) {
    // Guarantee: `$I.DESTROY` is the only caller, and it is cached by
    //   `$I.DESTROYED`, so a cancel never arrives twice.
    this[I.CANCELLED] = true;
    await this[I.READER].cancel(reason);
  }
}
