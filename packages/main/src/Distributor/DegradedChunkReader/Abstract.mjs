import * as Ow from '@produck/ow';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, S, _S } from './Symbol.mjs';

function catchDumpError(cause) {
  Ow.Error.Common('Failed to dump the ChunkStash.', { cause });
}
class AbstractDegradedChunkReader extends ChunkReader.Abstract {
  static [S.DUMPING] = new WeakMap();

  constructor(...args) {
    super(...args);
    this[I.CONSTRUCTOR] = new.target;
  }

  static dump(chunkStash) {
    const dumping = Promise.resolve()
      .then(() => this[_S.DUMP](chunkStash))
      .catch(catchDumpError);

    this[S.DUMPING].set(chunkStash, dumping);

    return dumping;
  }

  getChunkStashDumping() {
    return this[I.CONSTRUCTOR][S.DUMPING].get(this[ChunkReader.$I.CHUNK_STASH]);
  }

  [ChunkReader._I.INITIALIZE]() {
    return this.getChunkStashDumping();
  }
}

export default Abstract(
  AbstractDegradedChunkReader,
  Abstract.Static({
    [_S.DUMP]: M.Method(),
  }),
);
