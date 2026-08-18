import AbstractChunkReader from './Abstract.mjs';
import { I, $I, _I } from './Symbol.mjs';

export class BufferChunkReader extends AbstractChunkReader {
  [_I.INITIALIZE]() {
    // Sync init: memory-backed reader has no async barrier.
    return undefined;
  }

  async [_I.READ]() {
    const index = this[$I.PROGRESS] + this[I.CONSUMED];

    if (index >= this[$I.BUFFER_LIST].length) {
      return { done: true };
    }

    return { value: this[$I.BUFFER_LIST][index], done: false };
  }
}
