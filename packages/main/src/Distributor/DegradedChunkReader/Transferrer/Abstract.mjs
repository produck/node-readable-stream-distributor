import * as Ow from '@produck/ow';
import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I } from './Symbol.mjs';

function catchDumpError(cause) {
  Ow.Error.Common('Failed to dump the ChunkStash.', { cause });
}

class AbstractTransferrer {
  [I.DUMPING] = null;
  [I.DONE] = false;

  [$I.DUMP](chunkStash) {
    const dumping = Promise.resolve()
      .then(() => this[_I.DUMP](chunkStash))
      .catch(catchDumpError);

    this[I.DUMPING] = dumping;

    return dumping;
  }

  async [$I.WRITE](buffer) {
    await this[I.DUMPING];
    await this[_I.WRITE](buffer);
  }

  [$I.SET_DONE]() {
    this[I.DONE] = true;
  }

  get dumping() {
    return this[I.DUMPING];
  }

  get done() {
    return this[I.DONE];
  }
}

export default Abstract(
  AbstractTransferrer,
  Abstract({
    [_I.DUMP]: M.Method(),
    [_I.WRITE]: M.Method(),
  }),
);
