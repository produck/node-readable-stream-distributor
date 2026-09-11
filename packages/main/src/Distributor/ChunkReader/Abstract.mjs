import Abstract, { Member as M } from '@produck/es-abstract';

import { $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [$I.CONSUMED] = 0;

  constructor(puller, chunkStash) {
    this[$I.PULLER] = puller;
    this[$I.CHUNK_STASH] = chunkStash;
  }

  get chunkStash() {
    return this[$I.CHUNK_STASH];
  }

  async [$I.READ]() {
    // A satisfied target resolves at once, so pull first, then read.
    await this[$I.PULLER].pull(this[$I.CONSUMED]);

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
    // TODO: leaf obligations still to be enforced here —
    //   - answer `done: true` only once the stash is sealed
    //     (`ChunkStash.$I.DONE`), never just because nothing is readable yet;
    //   - a leaf may answer `{ value: undefined, done: false }` at the
    //     frontier;
    //   - on source error, reject with a distinguishable error so the
    //     consumer stream errors automatically.
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
  }),
);
