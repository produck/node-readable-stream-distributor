import { deepFreeze } from '@produck/deep-freeze-enumerable';

const _I_READ = Symbol('._read()');
const _I_CLOSE = Symbol('._close()');
const I_CONSUMED = Symbol('.#consumed');
const I_CLOSED = Symbol('.#closed');

export const _I = deepFreeze({
  READ: _I_READ,
  CLOSE: _I_CLOSE,
});

export const I = deepFreeze({
  CONSUMED: I_CONSUMED,
  CLOSED: I_CLOSED,
});
