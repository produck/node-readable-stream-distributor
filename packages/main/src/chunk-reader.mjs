import Abstract, { Member as M } from '@produck/es-abstract';

import { _IReader } from './Symbol.mjs';

const ChunkReader = class {
  [_IReader.READ]() {
    throw new Error('Not implemented');
  }

  async skip(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError('n must be a non-negative integer');
    }

    for (let i = 0; i < n; i++) {
      await this[_IReader.READ]();
    }
  }
};

export default Abstract(
  ChunkReader,
  Abstract({
    [_IReader.READ]: M.Method(),
  }),
);
