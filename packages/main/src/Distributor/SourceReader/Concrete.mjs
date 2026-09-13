import * as Ow from '@produck/ow';

import { I } from './Symbol.mjs';

export default class SourceReader {
  [I.DONE] = false;
  [I.ERROR] = null;
  [I.CANCELLED] = false;
  [I.CONSUMED_CHUNK_COUNT] = 0;

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

  get consumedChunkCount() {
    return this[I.CONSUMED_CHUNK_COUNT];
  }

  async read() {
    const result = await this[I.READER].read().catch((cause) => {
      if (!this[I.CANCELLED]) {
        this[I.ERROR] = cause;
      }

      throw cause;
    });

    if (!this[I.CANCELLED]) {
      this[I.DONE] = result.done;
    }

    if (!result.done) {
      this[I.CONSUMED_CHUNK_COUNT]++;
    }

    return result;
  }

  async cancel(reason) {
    if (this[I.CANCELLED]) {
      return;
    }

    this[I.CANCELLED] = true;

    await this[I.READER].cancel(reason);
  }
}
