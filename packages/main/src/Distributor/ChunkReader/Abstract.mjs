import Abstract, { Member as M } from '@produck/es-abstract';

import { $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [$I.CONSUMED] = 0;

  constructor({ chunkStash }) {
    this[$I.CHUNK_STASH] = chunkStash;
  }

  get chunkStash() {
    return this[$I.CHUNK_STASH];
  }

  async [$I.READ]() {
    const { value, done } = await this[_I.READ]();

    if (!done) {
      this[$I.CONSUMED]++;
    }

    return { value, done };
  }

  get consumedChunks() {
    return this[$I.CONSUMED];
  }
}

export default Abstract(
  AbstractChunkReader,
  Abstract({
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
  }),
);
