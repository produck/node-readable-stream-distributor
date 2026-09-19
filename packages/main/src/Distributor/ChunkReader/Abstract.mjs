import Abstract, { Member as M } from '@produck/es-abstract';

import { $I, _I, A } from './_Symbol.mjs';

class AbstractChunkReader {
  [A.$I.CONSUMED_COUNT] = 0;

  constructor(sourceConsumptionAgent, chunkStash) {
    this[A.I.AGENT] = sourceConsumptionAgent;
    this[A.$I.STASH] = chunkStash;
  }

  async [$I.READ]() {
    const result = await this[_I.READ]();

    if (!result.done) {
      this[A.$I.CONSUMED_COUNT]++;
    }

    return result;
  }

  async [$I.ENSURE_THEN_READ]() {
    await this[A.I.AGENT].ensure(this[A.$I.CONSUMED_COUNT]);

    return this[$I.READ]();
  }
}

export default Abstract(
  AbstractChunkReader,
  Abstract({
    // TODO: medium-side obligations still to be enforced here —
    //   - answer `done: true` only once the stash is sealed
    //     (`A.STASH.$I.SEALED`), never just because nothing is readable yet;
    //   - the medium side may answer `{ value: undefined, done: false }` at the
    //     frontier;
    //   - on source error, reject with a distinguishable error so the
    //     consumer stream errors automatically.
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
  }),
);
