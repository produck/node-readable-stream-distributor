import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I } from './Symbol.mjs';

class ChunkReader {
  [I.CONSUMED] = 0;
  [I.CLOSED] = false;
  [I.INITIALIZATION_STARTED] = false;
  [I.INITIALIZED];

  // The subclass calls START_INITIALIZE once at the end of its own
  // constructor (after stashing params); it is not auto-run here so the
  // subclass controls the exact timing.
  [$I.START_INITIALIZE]() {
    // TODO: START_INITIALIZE MUST be called within the same tick as the
    // constructor. The abstract layer should guard this (e.g. a microtask
    // that revokes an "initializable" flag set during construction, so an
    // asynchronous call throws).
    if (this[I.INITIALIZATION_STARTED]) {
      return;
    }

    this[I.INITIALIZATION_STARTED] = true;

    // `_I.INITIALIZE` may return undefined (sync init, no barrier) or a
    // PromiseLike<undefined> (async init, read/close await it).
    this[I.INITIALIZED] = this[_I.INITIALIZE]();
  }

  [_I.CLOSE]() {
    // Default no-op: readers without resources (e.g. BufferChunkReader)
    // inherit this.
  }

  async close() {
    if (this[I.CLOSED]) {
      return;
    }

    this[I.CLOSED] = true;
    await this[I.INITIALIZED];
    await this[_I.CLOSE]();
  }

  async read() {
    await this[I.INITIALIZED];

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
    [_I.CLOSE]: M.Method(),
    [_I.INITIALIZE]: M.Method(),
  }),
);
