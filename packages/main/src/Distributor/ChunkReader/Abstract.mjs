import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [$I.CONSUMED_CHUNK_COUNT] = 0;

  constructor(sourceConsumptionAgent, chunkStash) {
    this[I.SOURCE_CONSUMPTION_AGENT] = sourceConsumptionAgent;
    this[$I.CHUNK_STASH] = chunkStash;
  }

  async [$I.READ]() {
    const result = await this[_I.READ]();

    if (!result.done) {
      this[$I.CONSUMED_CHUNK_COUNT]++;
    }

    return result;
  }

  async [$I.ENSURE_THEN_READ]() {
    const agent = this[I.SOURCE_CONSUMPTION_AGENT];

    await agent.ensure(this[$I.CONSUMED_CHUNK_COUNT]);

    return this[$I.READ]();
  }
}

export default Abstract(
  AbstractChunkReader,
  Abstract({
    // TODO: medium-side obligations still to be enforced here —
    //   - answer `done: true` only once the stash is sealed
    //     (`ChunkStash.$I.SEALED`), never just because nothing is readable yet;
    //   - the medium side may answer `{ value: undefined, done: false }` at the
    //     frontier;
    //   - on source error, reject with a distinguishable error so the
    //     consumer stream errors automatically.
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
  }),
);
