import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CHUNKS = Symbol('.#chunks');
const I_BYTE_LENGTH = Symbol('.#byteLength');
const I_DROPPED = Symbol('.#dropped');

export const I = deepFreeze({
  CHUNKS: I_CHUNKS,
  BYTE_LENGTH: I_BYTE_LENGTH,
  DROPPED: I_DROPPED,
});

const $I_PUSH = Symbol('.$push()');

export const $I = deepFreeze({
  PUSH: $I_PUSH,
});
