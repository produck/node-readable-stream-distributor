import * as Ow from '@produck/ow';

import * as ChunkStash from './ChunkStash/index.mjs';
import { I, $I } from './Symbol.mjs';

export default class SourceConsumptionAgent {
  degraded = false;
  pulling = null;
  pulledChunkCount = 0;

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
    const { distributor } = this;
    const sourceReader = distributor[I.SOURCE_READER];

    // `pulledChunkCount` is this agent's own account of the hand-offs, not the
    //   store's: one per chunk handed over, whichever store took it. `pull`
    //   settles a chunk only once it is readable — that storage contract is
    //   what lets the judge trust this count. The choice of store is `pull`'s.
    // TODO: backpressure — hold off while the buffer is full and the last dump
    //   has not settled.
    while (target >= this.pulledChunkCount && !sourceReader.done) {
      if (this.pulling === null) {
        this.pulling = this.pull().finally(() => (this.pulling = null));
      }

      await this.pulling;
    }
  }

  async pull() {
    const { value, done } = await this.distributor[I.SOURCE_READER].read();

    if (this.degraded) {
      await this.toTransferrer(value, done);
    } else {
      this.toStash(value, done);
    }

    // Counting here — not in `ensure` after the await — is what makes each
    //   pull counted exactly once: every waiter joins this same pull.
    if (!done) {
      this.pulledChunkCount++;
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

    // NEED DEGRADING???
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
