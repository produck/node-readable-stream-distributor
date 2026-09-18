import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import * as Transferrer from './Transferrer/index.mjs';
import { I, $I, _I, _S } from './Symbol.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  [I.CLOSED] = false;
  [I.INITIALIZED];
  [I.SEEKED_CHUNK_COUNT] = 0;
  [I.ERROR] = null;

  get chunkStash() {
    return this[ChunkReader.$I.CHUNK_STASH];
  }

  constructor(sourceConsumptionAgent, chunkStash, transferrer) {
    super(sourceConsumptionAgent, chunkStash);
    this[$I.TRANSFERRER] = transferrer;
  }

  get closed() {
    return this[I.CLOSED];
  }

  [$I.REQUEST_INITIALIZE](progress) {
    this[ChunkReader.$I.CONSUMED_CHUNK_COUNT] = progress;
    this[I.INITIALIZED] = this[I.INITIALIZE]();
  }

  async [I.INITIALIZE]() {
    const transferrer = this[$I.TRANSFERRER];

    try {
      await transferrer.dumping;
      await this[_I.INITIALIZE]();
      await this[I.SYNC]();
    } catch (cause) {
      this[I.ERROR] = cause;
    }
  }

  async [I.SYNC]() {
    const target = this[ChunkReader.$I.CONSUMED_CHUNK_COUNT];
    let count = this[I.SEEKED_CHUNK_COUNT];

    while (count < target) {
      if (!(await this[_I.SEEK]())) {
        break;
      }

      count++;
    }

    this[I.SEEKED_CHUNK_COUNT] = count;
  }

  async [$I.CLOSE]() {
    if (this[I.CLOSED]) {
      return;
    }

    this[I.CLOSED] = true;
    await this[I.INITIALIZED];
    await this[_I.CLOSE]();
  }

  async [ChunkReader._I.READ]() {
    const transferrer = this[$I.TRANSFERRER];
    const position = this[ChunkReader.$I.CONSUMED_CHUNK_COUNT];

    await transferrer[Transferrer.$I.WAIT_CHUNK](position);

    const chunk = transferrer[Transferrer.$I.PEEK](position);

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
      this[I.SEEKED_CHUNK_COUNT]++;
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
