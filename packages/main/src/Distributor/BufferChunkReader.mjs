import * as ChunkReader from './ChunkReader/index.mjs';
import * as ChunkStash from './ChunkStash/index.mjs';

export class BufferChunkReader extends ChunkReader.Abstract {
  async [ChunkReader._I.READ]() {
    const index = this[ChunkReader.$I.CONSUMED];
    const chunkStash = this.chunkStash;

    return {
      value: chunkStash.get(index),
      done: index >= chunkStash.length && chunkStash[ChunkStash.$I.DONE],
    };
  }
}
