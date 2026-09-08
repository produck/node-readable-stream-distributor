import * as Ow from '@produck/ow';
import { ThrowTypeError } from '@produck/type-error';
import Abstract from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import * as Transferrer from './Transferrer/index.mjs';
import { I, S } from './Symbol.mjs';

class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  constructor(...args) {
    super(...args);

    this[I.CONSTRUCTOR] = new.target;

    if (new.target.transferrer === undefined) {
      Ow.Error.Common('A transferrer must be configured before instantiation');
    }
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

  [ChunkReader._I.INITIALIZE]() {
    return this.chunkStashDumping;
  }
}

export default Abstract(AbstractDegradedChunkReader);
