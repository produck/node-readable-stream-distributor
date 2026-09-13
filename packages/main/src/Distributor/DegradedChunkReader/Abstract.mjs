import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import * as Transferrer from './Transferrer/index.mjs';
import { I, $I, _I, S } from './Symbol.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  [I.CLOSED] = false;
  [I.INITIALIZED];

  constructor(...args) {
    if (new.target.transferrer === undefined) {
      Ow.Error.Common('A transferrer must be configured before instantiation');
    }

    super(...args);
    this[I.CONSTRUCTOR] = new.target;
  }

  static get transferrer() {
    return this[S.TRANSFERRER];
  }

  static set transferrer(transferrer) {
    if (this[S.TRANSFERRER] !== undefined) {
      Ow.Error.Common('transferrer is already configured');
    }

    if (!(transferrer instanceof Transferrer.Abstract)) {
      ThrowTypeError('transferrer', 'a <Concrete>Transferrer instance');
    }

    this[S.TRANSFERRER] = transferrer;
  }

  get chunkStashDumping() {
    return this[I.CONSTRUCTOR].transferrer.getDumping(this.chunkStash);
  }

  get closed() {
    return this[I.CLOSED];
  }

  [$I.REQUEST_INITIALIZE](progress) {
    this[ChunkReader.$I.CONSUMED] = progress;
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
);
