import * as Ow from '@produck/ow';

import * as ChunkStash from './ChunkStash/index.mjs';
import { I, $I } from './Symbol.mjs';

export default class SourceConsumptionAgent {
  degraded = false;

  // Contract: this constructor must not throw. The distributor builds it after
  //   taking the source lock, so a throw here would leave a locked source with
  //   no owner. Keep the body to plain assignments — no validation, no call
  //   that can fail.
  constructor(distributor) {
    this.distributor = distributor;
  }

  // Before the ChunkReader consumes it, the store is guaranteed ready —
  // `ChunkStash` in the memory phase, the transferrer once degraded. The
  // chunk at `target` is there, or the store is done; a source error rejects;
  // a switch started inside has settled.
  async ensure(target) {
    const sourceReader = this.distributor[I.SOURCE_READER];

    if (sourceReader.done) {
      return;
    }

    if (target < sourceReader.consumedChunkCount) {
      return;
    }

    // TODO: coalesce — all forks share this one object, so concurrent calls
    //   must settle together, with the largest `target` winning.
    // TODO: backpressure — hold off while the buffer is full and the last dump
    //   has not settled.
    // TODO: degraded — the target has to be measured against the switched
    //   medium instead of this buffer.
    const { value, done } = await sourceReader.read();

    if (this.degraded) {
      await this.toTransferrer(value, done);
    } else {
      this.toStash(value, done);
    }
  }

  toStash(chunk, done) {
    const { distributor } = this;
    const chunkStash = distributor[I.CHUNK_STASH];

    if (done) {
      chunkStash[ChunkStash.$I.SET_DONE]();

      return;
    }

    chunkStash[ChunkStash.$I.PUSH](chunk);

    if (chunkStash.byteLength > distributor.stashByteLimit) {
      chunkStash[ChunkStash.$I.SEAL]();
      this.degraded = true;
      distributor[$I.DEGRADE]();
    }
  }

  async toTransferrer(chunk, done) {
    // TODO: record the chunk — and the end — in the switched medium. Which
    //   transferrer instance serves this distributor is still open: the
    //   strategy configures one on its own reader class.
    void chunk;
    void done;
    Ow.Error.Common('Not implemented');
  }
}
