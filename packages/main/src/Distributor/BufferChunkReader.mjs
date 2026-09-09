import * as ChunkReader from './ChunkReader/index.mjs';

export class BufferChunkReader extends ChunkReader.Abstract {
  async [ChunkReader._I.READ]() {
    const index = this[ChunkReader.$I.CONSUMED];
    const chunkStash = this.chunkStash;

    if (index >= chunkStash.length) {
      return { done: true };
    }

    return { value: chunkStash.get(index), done: false };
  }
}
