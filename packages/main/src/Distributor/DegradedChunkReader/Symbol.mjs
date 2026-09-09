import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
});

const _I_SEEK = Symbol('._seek()');

export const _I = deepFreeze({
  SEEK: _I_SEEK,
});

const S_TRANSFERRER = Symbol('S.transferrer');

export const S = deepFreeze({
  TRANSFERRER: S_TRANSFERRER,
});
