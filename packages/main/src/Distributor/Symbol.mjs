import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');
const I_SOURCE_READER = Symbol('.#sourceReader');
const I_BUFFER_STASH = Symbol('.#bufferStash');
const I_DESTROYED = Symbol('.#destroyed');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
  SOURCE_READER: I_SOURCE_READER,
  BUFFER_STASH: I_BUFFER_STASH,
  DESTROYED: I_DESTROYED,
});

const $I_REGISTRY = Symbol('.$registry');
const $I_PRUNE = Symbol('.$prune()');

export const $I = deepFreeze({
  REGISTRY: $I_REGISTRY,
  PRUNE: $I_PRUNE,
});

const S_HIGH_WATER_MARK = Symbol('._highWaterMark()');

export const _S = deepFreeze({
  HIGH_WATER_MARK: S_HIGH_WATER_MARK,
});
