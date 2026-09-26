import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import * as Event from '../Event.mjs';
import { I, $I, _I, _S, A } from './_Symbol.mjs';
import { TRANSFERRER, DISTRIBUTOR, _A } from './_External.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  [I.CLOSED] = false;
  [I.INITIALIZED];
  [A.I.SEEKED_COUNT] = 0;

  get chunkStash() {
    const distributor = this[_A.READER.A.I.DISTRIBUTOR];

    return distributor[DISTRIBUTOR.A.$I.STASH];
  }

  get closed() {
    return this[I.CLOSED];
  }

  get transferrer() {
    const distributor = this[_A.READER.A.I.DISTRIBUTOR];

    return distributor[DISTRIBUTOR.$I.TRANSFERRER];
  }

  [$I.REQUEST_INITIALIZE](progress) {
    this[_A.READER.A.$I.CONSUMED_COUNT] = progress;
    this[I.INITIALIZED] = this[I.INITIALIZE]();

    return this[I.INITIALIZED];
  }

  async [I.INITIALIZE]() {
    const distributor = this[_A.READER.A.I.DISTRIBUTOR];

    try {
      await this.transferrer.dumping;
      await this[_I.INITIALIZE]();
      await this[I.SYNC]();
    } catch (cause) {
      distributor.dispatchEvent(new Event.Warn('initialize-failed', cause));
      throw cause;
    }
  }

  async [I.SYNC]() {
    const distributor = this[_A.READER.A.I.DISTRIBUTOR];
    const target = this[_A.READER.A.$I.CONSUMED_COUNT];
    let count = this[A.I.SEEKED_COUNT];

    try {
      while (count < target) {
        if (!(await this[_I.SEEK]())) {
          break;
        }

        count++;
      }
    } catch (cause) {
      distributor.dispatchEvent(new Event.Warn('seek-failed', cause));
      throw cause;
    }

    this[A.I.SEEKED_COUNT] = count;
  }

  [_A.READER.$I.CLOSE]() {
    if (this[I.CLOSED]) {
      return;
    }

    const distributor = this[_A.READER.A.I.DISTRIBUTOR];

    this[I.CLOSED] = true;
    Promise.resolve()
      .then(() => this[_I.CLOSE]())
      .catch((cause) => {
        distributor.dispatchEvent(new Event.Warn('close-failed', cause));
      });
  }

  async [_A.READER._I.READ]() {
    const transferrer = this.transferrer;
    const position = this[_A.READER.A.$I.CONSUMED_COUNT];

    await transferrer[TRANSFERRER.$I.WAIT_POSITION](position);

    const chunk = transferrer[TRANSFERRER.$I.PEEK](position);

    if (chunk !== undefined) {
      return { done: false, value: chunk };
    }

    return await this[I.READ_BACK]();
  }

  async [I.READ_BACK]() {
    const distributor = this[_A.READER.A.I.DISTRIBUTOR];

    await this[I.INITIALIZED];
    await this[I.SYNC]();

    let result;

    try {
      result = await this[_I.READ]();
    } catch (cause) {
      distributor.dispatchEvent(new Event.Warn('read-failed', cause));
      throw cause;
    }

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
