import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [$I.CONSUMED] = 0;
  [I.CLOSED] = false;
  [I.INITIALIZED];

  constructor({ chunkStash }) {
    this[$I.CHUNK_STASH] = chunkStash;
  }

  get chunkStash() {
    return this[$I.CHUNK_STASH];
  }

  [$I.REQUEST_INITIALIZE](progress) {
    this[$I.CONSUMED] = progress;
    this[I.INITIALIZED] = this[_I.INITIALIZE]();
  }

  async [$I.CLOSE]() {
    if (this[I.CLOSED]) {
      return;
    }

    this[I.CLOSED] = true;
    await this[I.INITIALIZED];
    await this[_I.CLOSE]();
  }

  get closed() {
    return this[I.CLOSED];
  }

  async [$I.READ]() {
    await this[I.INITIALIZED];

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
    [_I.CLOSE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.INITIALIZE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
  }),
);
