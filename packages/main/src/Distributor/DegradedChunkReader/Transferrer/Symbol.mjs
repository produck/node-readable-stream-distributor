import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_DUMPING = Symbol('.#dumping');
const I_DONE = Symbol('.#done');

export const I = deepFreeze({
  DUMPING: I_DUMPING,
  DONE: I_DONE,
});

const $I_DUMP = Symbol('.$dump()');
const $I_WRITE = Symbol('.$write()');
const $I_SET_DONE = Symbol('.$setDone()');

export const $I = deepFreeze({
  DUMP: $I_DUMP,
  WRITE: $I_WRITE,
  SET_DONE: $I_SET_DONE,
});

const _I_DUMP = Symbol('._dump()');
const _I_WRITE = Symbol('._write()');

export const _I = deepFreeze({
  DUMP: _I_DUMP,
  WRITE: _I_WRITE,
});
