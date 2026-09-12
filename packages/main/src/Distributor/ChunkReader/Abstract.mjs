import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [$I.CONSUMED] = 0;

  constructor(sourceConsumptionAgent, chunkStash) {
    this[I.SOURCE_CONSUMPTION_AGENT] = sourceConsumptionAgent;
    this[$I.CHUNK_STASH] = chunkStash;
  }

  get chunkStash() {
    return this[$I.CHUNK_STASH];
  }

  async [$I.READ]() {
    await this[I.SOURCE_CONSUMPTION_AGENT].ensure(this[$I.CONSUMED]);

    const result = await this[_I.READ]();

    this[$I.CONSUMED]++;

    return result;
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
    //     (`ChunkStash.$I.SEALED`), never just because nothing is readable yet;
    //   - a leaf may answer `{ value: undefined, done: false }` at the
    //     frontier;
    //   - on source error, reject with a distinguishable error so the
    //     consumer stream errors automatically.
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
  }),
);
