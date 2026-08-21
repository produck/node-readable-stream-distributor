import AbstractChunkReader from './Abstract.mjs';
import { I, $I, _I } from './Symbol.mjs';

export class BufferChunkReader extends AbstractChunkReader {
  [_I.INITIALIZE]() {
    // Sync init: memory-backed reader has no async barrier.
    return undefined;
  }

  async [_I.READ]() {
    const index = this[$I.PROGRESS] + this[I.CONSUMED];

    if (index >= this[$I.CHUNK_STASH].length) {
      return { done: true };
    }

    return { value: this[$I.CHUNK_STASH].get(index), done: false };
  }
}
