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

  get error() {
    return this[I.ERROR];
  }

  get cancelled() {
    return this[I.CANCELLED];
  }

  get reading() {
    return this[I.READING];
  }

  get finished() {
    return this.done || this.cancelled;
  }

  async [I.READ]() {
    if (this[I.CANCELLED]) {
      return { done: true, value: undefined };
    }

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
    if (this[I.CANCELLED]) {
      return;
    }

    this[I.CANCELLED] = true;

    await this[I.READER].cancel(reason);
  }
}
