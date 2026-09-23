import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CHUNKS = Symbol('.#chunks');
const I_BYTE_LENGTH = Symbol('.#byteLength');
const I_DONE = Symbol('.#done');

export const I = deepFreeze({
  CHUNKS: I_CHUNKS,
  BYTE_LENGTH: I_BYTE_LENGTH,
  DONE: I_DONE,
});

const $I_SET_DONE = Symbol('.$setDone()');
const $I_DROP = Symbol('.$drop()');
const $I_PUSH = Symbol('.$push()');

export const $I = deepFreeze({
  SET_DONE: $I_SET_DONE,
  DROP: $I_DROP,
  PUSH: $I_PUSH,
});
