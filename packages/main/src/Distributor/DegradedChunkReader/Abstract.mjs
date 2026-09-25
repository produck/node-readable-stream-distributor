import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, $I, _I, _S, A } from './_Symbol.mjs';
import { TRANSFERRER, _A } from './_External.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  [I.CLOSED] = false;
  [I.INITIALIZED];
  [A.I.SEEKED_COUNT] = 0;

  get chunkStash() {
    return this[_A.READER.A.$I.STASH];
  }

  constructor(agent, stash, transferrer) {
    super(agent, stash);
    this[$I.TRANSFERRER] = transferrer;
  }

  get closed() {
    return this[I.CLOSED];
  }

  get transferrer() {
    return this[$I.TRANSFERRER];
  }

  [$I.REQUEST_INITIALIZE](progress) {
    this[_A.READER.A.$I.CONSUMED_COUNT] = progress;
    this[I.INITIALIZED] = this[I.INITIALIZE]();

    return this[I.INITIALIZED];
  }

  async [I.INITIALIZE]() {
    // TODO: review the per-reader report: a refused dump rejects this chain
    //   too, so every reader adds its own warn('initialize-failed').
    await this[$I.TRANSFERRER].dumping;
    await this[_I.INITIALIZE]();
    await this[I.SYNC]();
  }

  async [I.SYNC]() {
    const target = this[_A.READER.A.$I.CONSUMED_COUNT];
    let count = this[A.I.SEEKED_COUNT];

    while (count < target) {
      // TODO: review the two routes of a host seek failure: rejecting the
      //   initialize chain (reported to the distributor), or rejecting the
      //   copy when SYNC runs from a read.
      if (!(await this[_I.SEEK]())) {
        break;
      }

      count++;
    }

    this[A.I.SEEKED_COUNT] = count;
  }

  [_A.READER.$I.CLOSE]() {
    if (this[I.CLOSED]) {
      return;
    }

    this[I.CLOSED] = true;
    // TODO: review the silent swallow: a host close failure has no observer.
    Promise.resolve(this[_I.CLOSE]()).catch(() => {});
  }

  async [_A.READER._I.READ]() {
    const transferrer = this[$I.TRANSFERRER];
    const position = this[_A.READER.A.$I.CONSUMED_COUNT];

    await transferrer[TRANSFERRER.$I.WAIT_POSITION](position);

    const chunk = transferrer[TRANSFERRER.$I.PEEK](position);

    if (chunk !== undefined) {
      return { done: false, value: chunk };
    }

    return this[I.READ_BACK]();
  }

  async [I.READ_BACK]() {
    // TODO: review this await: the initialize chain's failure (a refused dump,
    //   a host initialize or seek) arrives here and rejects the copy.
    await this[I.INITIALIZED];

    await this[I.SYNC]();

    // TODO: review a host read that throws, rejects, or answers outside the
    //   declared result shape: it rejects this copy's stream.
    const result = await this[_I.READ]();

    if (!result.done) {
      this[A.I.SEEKED_COUNT]++;
    }

    return result;
  }

  async [_I.INITIALIZE]() {}
}

export default Abstract(
  AbstractDegradedChunkReader,
  Abstract({
    [_I.READ]: M.Method().returns(
      M.OrPromiseLike(ChunkReader.Parser.ReadableStreamResult),
    ),
    [_I.INITIALIZE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.CLOSE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.SEEK]: M.Method().returns(M.OrPromiseLike(M.Boolean)),
  }),
  Abstract.Static({
    [_S.TRANSFERRER_CTOR]: M.Function,
  }),
);
