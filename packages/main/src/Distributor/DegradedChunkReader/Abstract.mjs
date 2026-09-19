import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, $I, _I, _S, A } from './_Symbol.mjs';
import { TRANSFERRER, _A } from './_External.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  [I.CLOSED] = false;
  [I.INITIALIZED];
  [A.I.SEEKED_COUNT] = 0;
  [I.ERROR] = null;

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

  [$I.REQUEST_INITIALIZE](progress) {
    this[_A.READER.A.$I.CONSUMED_COUNT] = progress;
    this[I.INITIALIZED] = this[I.INITIALIZE]();
  }

  async [I.INITIALIZE]() {
    try {
      await this[$I.TRANSFERRER].dumping;
      await this[_I.INITIALIZE]();
      await this[I.SYNC]();
    } catch (cause) {
      this[I.ERROR] = cause;
    }
  }

  async [I.SYNC]() {
    const target = this[_A.READER.A.$I.CONSUMED_COUNT];
    let count = this[A.I.SEEKED_COUNT];

    while (count < target) {
      if (!(await this[_I.SEEK]())) {
        break;
      }

      count++;
    }

    this[A.I.SEEKED_COUNT] = count;
  }

  async [$I.CLOSE]() {
    if (this[I.CLOSED]) {
      return;
    }

    this[I.CLOSED] = true;
    await this[I.INITIALIZED];
    await this[_I.CLOSE]();
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
    await this[I.INITIALIZED];

    if (this[I.ERROR] !== null) {
      throw this[I.ERROR];
    }

    await this[I.SYNC]();

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
    // Contract: `_I.SEEK` crosses one record boundary without reading a body,
    //   answering `false` when the medium has no record left to cross; the
    //   driver drives it until that answer. `_I.READ` then serves the record
    //   the medium-side cursor stands on — that step is the read-back.
    [_I.READ]: M.Method().returns(M.OrPromiseLike(/* { done, value } */)),
    [_I.INITIALIZE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.CLOSE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.SEEK]: M.Method().returns(M.OrPromiseLike(M.Boolean)),
  }),
  Abstract.Static({
    [_S.TRANSFERRER_CTOR]: M.Function,
  }),
);
