import { I } from './ChunkReader/Symbol.mjs';
import * as ChunkReader from './ChunkReader/index.mjs';

export class BufferChunkReader extends ChunkReader.Abstract {
  [ChunkReader._I.INITIALIZE]() {}
  [ChunkReader._I.CLOSE]() {}

  async [ChunkReader._I.READ]() {
    const index = this[ChunkReader.$I.PROGRESS] + this[I.CONSUMED];
    const chunkStash = this[ChunkReader.$I.CHUNK_STASH];

    if (index >= chunkStash.length) {
      return { done: true };
    }

    return { value: chunkStash.get(index), done: false };
  }

  async [ChunkReader._I.SEEK]() {
    return (
      this[ChunkReader.$I.PROGRESS] + this[I.CONSUMED] >=
      this[ChunkReader.$I.CHUNK_STASH].length
    );
  }
}
