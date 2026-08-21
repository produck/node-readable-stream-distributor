import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I } from './Symbol.mjs';

class AbstractChunkReader {
  [I.CONSUMED] = 0;
  [I.CLOSED] = false;
  [I.INITIALIZATION_STARTED] = false;
  [I.INITIALIZED];

  // The Distributor passes `{ id, progress, chunkStash }`; these shared
  // context members are created here and subclasses use them directly.
  // The shared ChunkStash is the memory-phase buffer: BufferChunkReader
  // reads it directly, fallback readers drop it when switching.
  constructor({ id, progress = 0, chunkStash }) {
    this[$I.ID] = id;
    this[$I.PROGRESS] = progress;
    this[$I.CHUNK_STASH] = chunkStash;
  }

  // The Distributor calls START_INITIALIZE once, right after constructing
  // the reader (same tick). The subclass constructor only arranges context
  // (stashes params) and defines _I.INITIALIZE; it never triggers init, so
  // there is no post-init work that could create state uncertainty.
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
  AbstractChunkReader,
  Abstract({
    [_I.READ]: M.Method(),
    [_I.CLOSE]: M.Method(),
    [_I.INITIALIZE]: M.Method(),
  }),
);
