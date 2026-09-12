import * as Ow from '@produck/ow';

import * as ChunkStash from './ChunkStash/index.mjs';
import { I, $I } from './Symbol.mjs';

export default class SourceConsumptionAgent {
  constructor(distributor) {
    this.distributor = distributor;
  }

  async ensure(target) {
    const sourceReader = this.distributor[I.SOURCE_READER];

    if (sourceReader.done) {
      return;
    }

    if (target < sourceReader.consumedChunks) {
      return;
    }

    // TODO: coalesce — all forks share this one object, so concurrent calls
    //   must settle together, with the largest `target` winning.
    // TODO: backpressure — hold off while the buffer is full and the last dump
    //   has not settled.
    // TODO: degraded — the target has to be measured against the switched
    //   medium instead of this buffer.
    const chunk = await sourceReader.read();
    const done = sourceReader.done;

    return this.distributor.degraded
      ? this.toTransferrer(chunk, done)
      : this.toStash(chunk, done);
  }

  toStash(chunk, done) {
    const { [I.CHUNK_STASH]: chunkStash } = this.distributor;

    if (done) {
      chunkStash[ChunkStash.$I.SEALED] = true;

      return;
    }

    chunkStash[ChunkStash.$I.PUSH](chunk);

    if (chunkStash.byteLength > this.distributor.highWaterMark) {
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
