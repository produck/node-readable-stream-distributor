import * as Ow from '@produck/ow';

import { I } from './Symbol.mjs';

export default class SourceReader {
  [I.STREAM];
  [I.READER] = null;
  [I.PULLING] = null;
  [I.DONE] = false;
  [I.ERROR] = null;
  [I.CONSUMED] = 0;

  constructor(stream) {
    this[I.STREAM] = stream;
  }

  get done() {
    return this[I.DONE];
  }

  get error() {
    return this[I.ERROR];
  }

  get consumedChunks() {
    return this[I.CONSUMED];
  }

  async read() {
    // TODO: the device role only — lazily acquire the source reader once, then
    //   read a chunk from it. Scheduling (whether to pull at all, single
    //   flight, backpressure) belongs to the `Puller`.
    //   - a delivered chunk bumps `I.CONSUMED`, the source-side progress —
    //     the count of chunks taken out of the source, and the only progress
    //     that survives the memory → degraded switch;
    //   - whether `I.DONE` / `I.ERROR` are still needed here is TBD: the
    //     stream's own reader already latches the terminal state.
    Ow.Error.Common('Not implemented');
  }

  cancel() {
    // TODO: idempotent release of the source reader (cancel vs releaseLock
    //   chosen by the distributor call site).
    Ow.Error.Common('Not implemented');
  }
}
