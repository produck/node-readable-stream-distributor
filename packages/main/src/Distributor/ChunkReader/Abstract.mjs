import Abstract, { Member as M } from '@produck/es-abstract';

import { $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [$I.CONSUMED] = 0;

  constructor(chunkStash) {
    this[$I.CHUNK_STASH] = chunkStash;
  }

  get chunkStash() {
    return this[$I.CHUNK_STASH];
  }

  async [$I.READ]() {
    // TODO: frontier — a leaf may answer `{ value: undefined, done: false }`
    //   at the frontier. Here: bump `CONSUMED` only when a chunk was actually
    //   produced; wait at the frontier in a Promise/event-driven way (arrival
    //   or seal), never by re-check loops. Signal shape is TBD.
    // TODO: when short, prod the shared pull layer and await it — the await is
    //   the backpressure gate. This reader holds no reference to that layer
    //   yet.
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
