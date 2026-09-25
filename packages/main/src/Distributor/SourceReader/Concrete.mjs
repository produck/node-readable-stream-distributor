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
    // TODO: review a foreign getReader() that throws: the locked check above
    //   does not guarantee it succeeds, and it escapes this constructor.
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
    // TODO: review the source failure route: the foreign read error is stored
    //   when not cancelling, and rethrown to every waiting copy.
    const result = await this[I.READER].read().catch((cause) => {
      if (!this[I.CANCELLED]) {
        this[I.ERROR] = cause;
      }

      Ow.throw(cause);
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
    // TODO: review a foreign cancel that rejects: it reaches destroy() as a
    //   warn('source-cancel-failed') and nowhere else.
    await this[I.READER].cancel(reason);
  }
}
