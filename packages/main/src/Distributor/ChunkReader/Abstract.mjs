import Abstract, { Member as M } from '@produck/es-abstract';

import { $I, _I, A } from './_Symbol.mjs';
import * as Parser from './Parser.mjs';

class AbstractChunkReader {
  [A.$I.CONSUMED_COUNT] = 0;

  constructor(agent, stash) {
    this[A.I.AGENT] = agent;
    this[A.$I.STASH] = stash;
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

  [$I.CLOSE]() {}
}

export default Abstract(
  AbstractChunkReader,
  Abstract({
    [_I.READ]: M.Method().returns(M.OrPromiseLike(Parser.ReadableStreamResult)),
  }),
);
