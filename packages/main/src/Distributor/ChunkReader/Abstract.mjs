import Abstract, { Member as M } from '@produck/es-abstract';
import { ThrowTypeError } from '@produck/type-error';

import { I, $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [I.CONSUMED] = 0;
  [I.CLOSED] = false;
  [I.INITIALIZATION_STARTED] = false;
  [I.INITIALIZED];

  constructor({ progress = 0, chunkStash }) {
    this[$I.PROGRESS] = progress;
    this[$I.CHUNK_STASH] = chunkStash;
  }

  [$I.START_INITIALIZE]() {
    // TODO: START_INITIALIZE MUST be called within the same tick as the
    // constructor. The abstract layer should guard this (e.g. a microtask
    // that revokes an "initializable" flag set during construction, so an
    // asynchronous call throws).
    if (this[I.INITIALIZATION_STARTED]) {
      return;
    }

    this[I.INITIALIZATION_STARTED] = true;
    this[I.INITIALIZED] = this[_I.INITIALIZE]();
  }

  async close() {
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

  async read() {
    await this[I.INITIALIZED];

    const { value, done } = await this[_I.READ]();

    if (!done) {
      this[I.CONSUMED]++;
    }

    return { value, done };
  }

  async skip(n = 1) {
    if (!Number.isInteger(n) || n < 0) {
      ThrowTypeError('n', 'a non-negative integer');
    }

    for (let i = 0; i < n; i++) {
      if (!(await this[_I.SEEK]())) {
        this[I.CONSUMED]++;
      }
    }
  }

  get consumedChunks() {
    return this[I.CONSUMED];
  }
}

export default Abstract(
  AbstractChunkReader,
  Abstract({
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
    [_I.CLOSE]: M.Method().returns(M.OrPromiseLike()),
    [_I.INITIALIZE]: M.Method().returns(M.OrPromiseLike()),
    [_I.SEEK]: M.Method().returns(M.OrPromiseLike(M.Boolean)),
  }),
);
