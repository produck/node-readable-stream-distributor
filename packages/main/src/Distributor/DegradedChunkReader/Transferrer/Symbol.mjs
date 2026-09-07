import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_DUMPING = Symbol('.#dumping');

export const I = deepFreeze({
  DUMPING: I_DUMPING,
});

const _I_DUMP = Symbol('._dump()');
const _I_WRITE = Symbol('._write()');

export const _I = deepFreeze({
  DUMP: _I_DUMP,
  WRITE: _I_WRITE,
});
