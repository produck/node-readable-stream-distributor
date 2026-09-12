import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CHUNKS = Symbol('.#chunks');
const I_BYTE_LENGTH = Symbol('.#byteLength');
const I_DROPPED = Symbol('.#dropped');
const I_SEALED = Symbol('.#sealed');
const I_DONE = Symbol('.#done');
const I_ASSERT_NOT_DROPPED = Symbol('.#assertNotDropped()');

export const I = deepFreeze({
  CHUNKS: I_CHUNKS,
  BYTE_LENGTH: I_BYTE_LENGTH,
  DROPPED: I_DROPPED,
  SEALED: I_SEALED,
  DONE: I_DONE,
  ASSERT_NOT_DROPPED: I_ASSERT_NOT_DROPPED,
});

const $I_SEAL = Symbol('.$seal()');
const $I_SET_DONE = Symbol('.$setDone()');
const $I_DROP = Symbol('.$drop()');
const $I_PUSH = Symbol('.$push()');

export const $I = deepFreeze({
  SEAL: $I_SEAL,
  SET_DONE: $I_SET_DONE,
  DROP: $I_DROP,
  PUSH: $I_PUSH,
});
