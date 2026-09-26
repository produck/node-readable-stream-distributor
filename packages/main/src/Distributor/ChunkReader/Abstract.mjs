import Abstract, { Member as M } from '@produck/es-abstract';

import { $I, _I, A } from './_Symbol.mjs';
import { DISTRIBUTOR } from './_External.mjs';
import * as Parser from './Parser.mjs';

class AbstractChunkReader {
  [A.$I.CONSUMED_COUNT] = 0;

  constructor(distributor) {
    this[A.I.DISTRIBUTOR] = distributor;
  }

  async [$I.READ]() {
    const result = await this[_I.READ]();

    if (!result.done) {
      this[A.$I.CONSUMED_COUNT]++;
    }

    return result;
  }

  async [$I.ENSURE_THEN_READ]() {
    const { [DISTRIBUTOR.A.$I.AGENT]: agent } = this[A.I.DISTRIBUTOR];

    await agent.ensure(this[A.$I.CONSUMED_COUNT]);

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
