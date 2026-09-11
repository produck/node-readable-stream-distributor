import * as Ow from '@produck/ow';

import * as ChunkStash from './ChunkStash/index.mjs';
import { I, $I } from './Symbol.mjs';

export default class Puller {
  distributor;

  constructor(distributor) {
    this.distributor = distributor;
  }

  async pull(target) {
    const {
      [I.SOURCE_READER]: sourceReader,
      [I.BUFFER_STASH]: buffer,
      degraded,
    } = this.distributor;

    // TODO: coalesce — all forks share this one object, so concurrent calls
    //   must settle together, with the largest `target` winning.
    // TODO: backpressure — hold off while the buffer is full and the last dump
    //   has not settled.
    // TODO: degraded — the target has to be measured against the switched
    //   medium instead of this buffer.
    if (buffer[ChunkStash.$I.DONE] || buffer.length > target) {
      return;
    }

    const { value, done } = await sourceReader.read();

    if (degraded) {
      return this.toTransferrer(value, done);
    }

    return this.toStash(value, done);
  }

  toStash(chunk, done) {
    const { [I.BUFFER_STASH]: buffer } = this.distributor;

    if (done) {
      buffer[ChunkStash.$I.DONE] = true;

      return;
    }

    buffer[ChunkStash.$I.PUSH](chunk);

    if (buffer.byteLength > this.distributor.highWaterMark) {
      this.distributor[$I.DEGRADE]();
    }
  }

  toTransferrer(chunk, done) {
    // TODO: record the chunk — and the end — in the switched medium. Which
    //   transferrer instance serves this distributor is still open: the
    //   strategy configures one on its own reader class.
    void chunk;
    void done;
    Ow.Error.Common('Not implemented');
  }
}
