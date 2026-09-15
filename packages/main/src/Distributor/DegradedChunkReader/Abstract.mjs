import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, $I, _I, _S } from './Symbol.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  [I.CLOSED] = false;
  [I.INITIALIZED];

  constructor(sourceConsumptionAgent, chunkStash, transferrer) {
    super(sourceConsumptionAgent, chunkStash);

    this[$I.TRANSFERRER] = transferrer;
  }

  get chunkStashDumping() {
    return this[$I.TRANSFERRER].dumping;
  }

  get closed() {
    return this[I.CLOSED];
  }

  [$I.REQUEST_INITIALIZE](progress) {
    this[ChunkReader.$I.CONSUMED_CHUNK_COUNT] = progress;
    this[I.INITIALIZED] = this[_I.INITIALIZE]();
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
    await this[I.INITIALIZED];

    const result = await this[_I.READ]();

    //TODO type checking
    return result;
  }

  [_I.INITIALIZE]() {
    return this.chunkStashDumping;
  }
}

export default Abstract(
  AbstractDegradedChunkReader,
  Abstract({
    [_I.READ]: M.Method().returns(M.OrPromiseLike()),
    [_I.INITIALIZE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.CLOSE]: M.Method().returns(M.OrPromiseLike(M.Undefined)),
    [_I.SEEK]: M.Method().returns(M.OrPromiseLike(M.Boolean)),
  }),
  Abstract.Static({
    [_S.TRANSFERRER_CTOR]: M.Function,
  }),
);
