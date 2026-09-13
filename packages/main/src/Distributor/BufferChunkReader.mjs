import * as ChunkReader from './ChunkReader/index.mjs';

export class BufferChunkReader extends ChunkReader.Abstract {
  async [ChunkReader._I.READ]() {
    const index = this[ChunkReader.$I.CONSUMED_CHUNK_COUNT];
    const chunkStash = this.chunkStash;
    const done = chunkStash.done && index >= chunkStash.length;
    const result = { done, value: undefined };

    if (!done) {
      result.value = chunkStash.get(index);
    }

    return result;
  }
}
