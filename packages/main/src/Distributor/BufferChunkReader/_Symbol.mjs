import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_SUCCESSOR = Symbol('.#successor');

export const I = deepFreeze({
  SUCCESSOR: I_SUCCESSOR,
});

const $I_HANDOVER = Symbol('.$handover()');

export const $I = deepFreeze({
  HANDOVER: $I_HANDOVER,
});
