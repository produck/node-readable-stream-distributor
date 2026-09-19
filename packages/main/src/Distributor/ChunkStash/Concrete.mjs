import * as Ow from '@produck/ow';

import { I, $I } from './_Symbol.mjs';

export default class ChunkStash {
  [I.CHUNKS] = [];
  [I.BYTE_LENGTH] = 0;
  [I.DROPPED] = false;
  [I.SEALED] = false;
  [I.DONE] = false;

  [I.ASSERT_NOT_DROPPED]() {
    if (this[I.DROPPED]) {
      Ow.Error.Common('ChunkStash has been dropped');
    }
  }

  [$I.SEAL]() {
    this[I.SEALED] = true;
  }

  [$I.SET_DONE]() {
    this[I.DONE] = true;
  }

  [$I.PUSH](chunk) {
    this[I.ASSERT_NOT_DROPPED]();
    this[I.CHUNKS].push(chunk);
    this[I.BYTE_LENGTH] += chunk.byteLength;
  }

  [$I.DROP]() {
    this[I.ASSERT_NOT_DROPPED]();
    this[I.DROPPED] = true;
    this[I.CHUNKS] = [];
    this[I.BYTE_LENGTH] = 0;
  }

  get dropped() {
    return this[I.DROPPED];
  }

  get sealed() {
    return this[I.SEALED];
  }

  get done() {
    return this[I.DONE];
  }

  get length() {
    return this[I.CHUNKS].length;
  }

  get byteLength() {
    return this[I.BYTE_LENGTH];
  }

  get(index) {
    this[I.ASSERT_NOT_DROPPED]();

    return this[I.CHUNKS][index];
  }

  chunks() {
    this[I.ASSERT_NOT_DROPPED]();

    return [...this[I.CHUNKS]].values();
  }
}
