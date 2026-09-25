import { $I, A } from './_Symbol.mjs';
import { _A, TRANSFERRER } from './_External.mjs';
import * as Event from './Event.mjs';
import * as Options from './Options/index.mjs';

const noop = () => {};

export default class SourceConsumptionAgent {
  pulling = null;
  pulledChunkCount = 0;

  constructor(distributor) {
    this.distributor = distributor;
  }

  get pullingSettled() {
    return Promise.resolve(this.pulling).catch(noop);
  }

  async settlePulling() {
    try {
      await this.pull();
    } catch (cause) {
      this.distributor.dispatchEvent(new Event.Warn('pull-failed', cause));
      throw cause;
    } finally {
      this.pulling = null;
    }
  }

  // Ensure the chunk is ready before downstream actually consumes it.
  async ensure(target) {
    const { distributor } = this;
    const source = distributor[A.I.SOURCE];

    while (target >= this.pulledChunkCount && !source.finished) {
      if (this.pulling === null) {
        this.pulling = this.settlePulling();
      }

      await this.pulling;
    }

    // Tail of the guarantee above: a pull still in flight belongs to another
    //   copy, so the store is not settled yet. No driving pattern reaches it
    //   (six of them, 14k ensure calls, see DEV.md); nothing outside rules it
    //   out, so the wait stays.
    /* c8 ignore next 3 */
    if (source.finished && this.pulling !== null) {
      await this.pulling;
    }
  }

  async pull() {
    // TODO: review the foreign read here: a source failure rejects this pull
    //   and therefore every waiting copy, and the chunk shape is never
    //   validated before both stores do byteLength arithmetic on it.
    const { value, done } = await this.distributor[A.I.SOURCE].read();

    if (this.distributor.degraded) {
      this.toTransferrer(value, done);
    } else {
      this.toStash(value, done);
      this.degradeIfNeeded();
    }

    if (!done) {
      this.pulledChunkCount++;
    }
  }

  degradeIfNeeded() {
    const { distributor } = this;
    const stash = distributor[A.I.STASH];

    // TODO: review both option reads below: they run a host-supplied getter
    //   inside a pull, so a throw rejects the pulling copy and skips the
    //   switch, leaving the phase in memory.
    if (stash.byteLength <= Options.Get.MaxStashByteLength(distributor)) {
      return;
    }

    if (stash.done && !Options.Get.DegradeOnStashFullAndDone(distributor)) {
      return;
    }

    distributor[$I.DEGRADE]();
  }

  toStash(chunk, done) {
    const { distributor } = this;
    const stash = distributor[A.I.STASH];

    if (done) {
      return void stash[_A.STASH.$I.SET_DONE]();
    }

    stash[_A.STASH.$I.PUSH](chunk);
  }

  toTransferrer(chunk, done) {
    const transferrer = this.distributor[$I.TRANSFERRER];

    if (done) {
      return void transferrer[TRANSFERRER.$I.SET_DONE]();
    }

    transferrer[TRANSFERRER.$I.WRITE](chunk);
    this.observeBacklog();
  }

  observeBacklog() {
    const { distributor } = this;
    const transferrer = distributor[$I.TRANSFERRER];
    // TODO: review the option read below: it runs a host-supplied getter
    //   inside a pull, so a throw rejects the pull that just wrote a chunk.
    const warningLength = Options.Get.MaxBacklogWarningByteLength(distributor);

    if (transferrer.pendingByteLength > warningLength) {
      const event = new Event.Warn('backlog', {
        byteLength: transferrer.pendingByteLength,
      });

      distributor.dispatchEvent(event);
    }
  }
}
