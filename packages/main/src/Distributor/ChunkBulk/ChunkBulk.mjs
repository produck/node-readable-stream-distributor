import { I, $I } from './Symbol.mjs';

export class ChunkBulk {
  [I.CHUNKS] = [];
  [I.BYTE_LENGTH] = 0;

  [$I.PUSH](chunk) {
    this[I.CHUNKS].push(chunk);
    this[I.BYTE_LENGTH] += chunk.byteLength;
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
