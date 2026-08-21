import * as Ow from '@produck/ow';

import { I, $I } from './Symbol.mjs';

export default class ChunkStash {
  [I.CHUNKS] = [];
  [I.BYTE_LENGTH] = 0;
  [I.DROPPED] = false;

  [$I.PUSH](chunk) {
    if (this[I.DROPPED]) {
      Ow.Error.Common('ChunkStash has been dropped');
    }

    this[I.CHUNKS].push(chunk);
    this[I.BYTE_LENGTH] += chunk.byteLength;
  }

  drop() {
    if (this[I.DROPPED]) {
      Ow.Error.Common('ChunkStash has been dropped');
    }

    this[I.DROPPED] = true;
    this[I.CHUNKS] = [];
    this[I.BYTE_LENGTH] = 0;
  }

  get length() {
    return this[I.CHUNKS].length;
  }

  get byteLength() {
    return this[I.BYTE_LENGTH];
  }

  get(index) {
    return this[I.CHUNKS][index];
  }
}
