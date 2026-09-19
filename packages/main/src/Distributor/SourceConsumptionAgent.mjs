import { $I, A } from './_Symbol.mjs';
import { _A, TRANSFERRER } from './_External.mjs';

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
    const sourceReader = distributor[A.I.SOURCE];

    // TODO: observation — the backlog is never capped by design (a hung
    //   medium is weathered while memory allows), so the host needs a way to
    //   watch its size instead of the source being throttled on it.
    while (target >= this.pulledChunkCount && !sourceReader.finished) {
      if (this.pulling === null) {
        this.pulling = this.pull().finally(() => (this.pulling = null));
      }

      await this.pulling;
    }

    if (sourceReader.finished && this.pulling !== null) {
      await this.pulling;
    }
  }

  async pull() {
    const { value, done } = await this.distributor[A.I.SOURCE].read();

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
    const chunkStash = distributor[A.I.STASH];

    if (done) {
      chunkStash[_A.STASH.$I.SET_DONE]();

      return;
    }

    chunkStash[_A.STASH.$I.PUSH](chunk);

    // NEED DEGRADING???
    if (chunkStash.byteLength > distributor[A.$I.LIMIT]) {
      chunkStash[_A.STASH.$I.SEAL]();
      this.degraded = true;
      distributor[$I.DEGRADE]();
    }
  }

  async toTransferrer(chunk, done) {
    const { distributor } = this;
    const transferrer = distributor[$I.TRANSFERRER];

    // TODO: this flag is process-local — a strategy that needs the end
    //   recorded in its own medium would have to extend the transferrer
    //   contract.
    if (done) {
      transferrer[TRANSFERRER.$I.SET_DONE]();

      return;
    }

    await transferrer[TRANSFERRER.$I.WRITE](chunk);
  }
}
