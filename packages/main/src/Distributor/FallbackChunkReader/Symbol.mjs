import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
});

const S_DUMPING = Symbol('S.dumping');

export const S = deepFreeze({
  DUMPING: S_DUMPING,
});

const _S_DUMP = Symbol('._dump()');

export const _S = deepFreeze({
  DUMP: _S_DUMP,
});
