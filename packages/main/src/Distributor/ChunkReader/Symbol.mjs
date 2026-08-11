import { deepFreeze } from '@produck/deep-freeze-enumerable';

const _I_READ = Symbol('._read()');
const I_CONSUMED = Symbol('.#consumed');

export const _I = deepFreeze({
  READ: _I_READ,
});

export const I = deepFreeze({
  CONSUMED: I_CONSUMED,
});
