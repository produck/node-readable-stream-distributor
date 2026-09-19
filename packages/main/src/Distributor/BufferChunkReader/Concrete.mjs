import * as ChunkReader from '../ChunkReader/index.mjs';

import { I, $I } from './_Symbol.mjs';
import { _A } from './_External.mjs';

export default class BufferChunkReader extends ChunkReader.Abstract {
  [I.SUCCESSOR] = null;

  [$I.HANDOVER](successor) {
    this[I.SUCCESSOR] = successor;
  }

  async [_A.READER._I.READ]() {
    const successor = this[I.SUCCESSOR];

    if (successor !== null) {
      return successor[_A.READER.$I.READ]();
    }

    const index = this[_A.READER.A.$I.CONSUMED_COUNT];
    const stash = this[_A.READER.A.$I.STASH];
    const done = stash.done && index >= stash.length;
    const result = { done, value: undefined };

    if (!done) {
      result.value = stash.get(index);
    }

    return result;
  }
}
