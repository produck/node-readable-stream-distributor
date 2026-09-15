import * as Ow from '@produck/ow';
import Abstract, { Member as M } from '@produck/es-abstract';

import { I, _I } from './Symbol.mjs';

function catchDumpError(cause) {
  Ow.Error.Common('Failed to dump the ChunkStash.', { cause });
}

class AbstractTransferrer {
  [I.DUMPING] = new WeakMap();
  [I.DONE] = new WeakSet();

  dump(chunkStash) {
    const dumping = Promise.resolve()
      .then(() => this[_I.DUMP](chunkStash))
      .catch(catchDumpError);

    this[I.DUMPING].set(chunkStash, dumping);

    return dumping;
  }

  async write(chunkStash, buffer) {
    await this.getDumping(chunkStash);
    await this[_I.WRITE](chunkStash, buffer);
  }

  setDone(chunkStash) {
    this[I.DONE].add(chunkStash);
  }

  getDumping(chunkStash) {
    return this[I.DUMPING].get(chunkStash);
  }

  getDone(chunkStash) {
    return this[I.DONE].has(chunkStash);
  }
}

export default Abstract(
  AbstractTransferrer,
  Abstract({
    [_I.DUMP]: M.Method(),
    [_I.WRITE]: M.Method(),
  }),
);
