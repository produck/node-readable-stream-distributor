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

  static async write(chunkStash, buffer) {
    await this.getDumping(chunkStash);
    await this[_S.WRITE](chunkStash, buffer);
  }

  static getDumping(chunkStash) {
    return this[S.DUMPING].get(chunkStash);
  }

  getChunkStashDumping() {
    return this[I.CONSTRUCTOR].getDumping(this[ChunkReader.$I.CHUNK_STASH]);
  }

  [ChunkReader._I.INITIALIZE]() {
    return this.getChunkStashDumping();
  }
}

export default Abstract(
  AbstractDegradedChunkReader,
  Abstract.Static({
    [_S.DUMP]: M.Method(),
    [_S.WRITE]: M.Method(),
  }),
);
