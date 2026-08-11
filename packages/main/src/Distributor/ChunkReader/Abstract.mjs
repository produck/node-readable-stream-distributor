import Abstract, { Member as M } from '@produck/es-abstract';

import { I, _I } from './Symbol.mjs';

class ChunkReader {
  [I.CONSUMED] = 0;

  async read() {
    const { value, done } = await this[_I.READ]();

    if (!done) {
      this[I.CONSUMED]++;
    }

    return { value, done };
  }

  async skip(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError('n must be a non-negative integer');
    }

    for (let i = 0; i < n; i++) {
      await this.read();
    }
  }

  get consumedChunks() {
    return this[I.CONSUMED];
  }
}

export default Abstract(
  ChunkReader,
  Abstract({
    [_I.READ]: M.Method(),
  }),
);
