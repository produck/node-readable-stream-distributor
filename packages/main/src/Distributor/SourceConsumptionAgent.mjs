import { $I, A } from './_Symbol.mjs';
import { _A, TRANSFERRER } from './_External.mjs';
import * as Event from './Event.mjs';
import * as Options from './Options/index.mjs';

export default class SourceConsumptionAgent {
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

    while (target >= this.pulledChunkCount && !sourceReader.finished) {
      if (this.pulling === null) {
        this.pulling = this.pull().finally(() => (this.pulling = null));
      }

      await this.pulling;
    }

    // Tail of the guarantee above: a pull still in flight belongs to another
    //   copy, so the store is not settled yet. No driving pattern reaches it
    //   (six of them, 14k ensure calls, see DEV.md); nothing outside rules it
    //   out, so the wait stays.
    /* c8 ignore next 3 */
    if (sourceReader.finished && this.pulling !== null) {
      await this.pulling;
    }
  }

  async pull() {
    const { value, done } = await this.distributor[A.I.SOURCE].read();

    if (this.distributor.degraded) {
      this.toTransferrer(value, done);
    } else {
      this.toStash(value, done);
      this.degradeIfNeeded();
    }

    // Counting here — not in `ensure` after the await — is what makes each
    //   pull counted exactly once: every waiter joins this same pull.
    if (!done) {
      this.pulledChunkCount++;
    }
  }

  degradeIfNeeded() {
    const { distributor } = this;
    const chunkStash = distributor[A.I.STASH];
    const limit = Options.Get.MaxStashByteLength(distributor);

    if (chunkStash.byteLength <= limit) {
      return;
    }

    const degradeOnDone = Options.Get.DegradeOnStashFullAndDone(distributor);

    if (chunkStash.done && !degradeOnDone) {
      return;
    }

    distributor[$I.DEGRADE]();
  }

  toStash(chunk, done) {
    const { distributor } = this;
    const chunkStash = distributor[A.I.STASH];

    if (done) {
      chunkStash[_A.STASH.$I.SET_DONE]();

      return;
    }

    chunkStash[_A.STASH.$I.PUSH](chunk);
  }

  toTransferrer(chunk, done) {
    const transferrer = this.distributor[$I.TRANSFERRER];

    if (done) {
      transferrer[TRANSFERRER.$I.SET_DONE]();

      return;
    }

    transferrer[TRANSFERRER.$I.WRITE](chunk);
    this.observeBacklog();
  }

  observeBacklog() {
    const { distributor } = this;
    const transferrer = distributor[$I.TRANSFERRER];
    const warningLength = Options.Get.MaxBacklogWarningByteLength(distributor);

    if (transferrer.pendingByteLength > warningLength) {
      const event = new Event.Warn('backlog', {
        byteLength: transferrer.pendingByteLength,
      });

      distributor.dispatchEvent(event);
    }
  }
}
