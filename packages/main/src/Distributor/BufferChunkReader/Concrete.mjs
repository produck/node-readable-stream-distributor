import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, $I } from './Symbol.mjs';

export default class BufferChunkReader extends ChunkReader.Abstract {
  [I.SUCCESSOR] = null;

  [$I.HANDOVER](successor) {
    this[I.SUCCESSOR] = successor;
  }

  async [ChunkReader._I.READ]() {
    const successor = this[I.SUCCESSOR];

    if (successor !== null) {
      return successor[ChunkReader.$I.READ]();
    }

    const index = this[ChunkReader.$I.CONSUMED_CHUNK_COUNT];
    const chunkStash = this[ChunkReader.$I.CHUNK_STASH];
    const done = chunkStash.done && index >= chunkStash.length;
    const result = { done, value: undefined };

    if (!done) {
      result.value = chunkStash.get(index);
    }

    return result;
  }
}
