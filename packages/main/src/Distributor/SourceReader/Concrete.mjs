import * as Ow from '@produck/ow';

import { I } from './Symbol.mjs';

export default class SourceReader {
  [I.STREAM];
  [I.READER] = null;
  [I.PULLING] = null;
  [I.DONE] = false;
  [I.ERROR] = null;

  constructor(stream) {
    this[I.STREAM] = stream;
  }

  get done() {
    return this[I.DONE];
  }

  get error() {
    return this[I.ERROR];
  }

  async read() {
    // TODO: shared by every fork — lazily acquire the source reader once, then
    //   single-flight on `I.PULLING`; `done` already → `{ done: true }`,
    //   captured error → rethrow, else `reader.read()` and latch `I.DONE` /
    //   `I.ERROR`. The awaited settle is the backpressure gate, and a
    //   rejection must stay distinguishable so `_I.READ` can forward it.
    Ow.Error.Common('Not implemented');
  }

  cancel() {
    // TODO: idempotent release of the source reader (cancel vs releaseLock
    //   chosen by the distributor call site).
    Ow.Error.Common('Not implemented');
  }
}
