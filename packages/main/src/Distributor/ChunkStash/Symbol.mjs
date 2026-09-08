import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CHUNKS = Symbol('.#chunks');
const I_BYTE_LENGTH = Symbol('.#byteLength');
const I_DROPPED = Symbol('.#dropped');
const I_ASSERT_NOT_DROPPED = Symbol('.#assertNotDropped()');

export const I = deepFreeze({
  CHUNKS: I_CHUNKS,
  BYTE_LENGTH: I_BYTE_LENGTH,
  DROPPED: I_DROPPED,
  ASSERT_NOT_DROPPED: I_ASSERT_NOT_DROPPED,
});

const $I_DROP = Symbol('.$drop()');
const $I_PUSH = Symbol('.$push()');

export const $I = deepFreeze({
  DROP: $I_DROP,
  PUSH: $I_PUSH,
});
