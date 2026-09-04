import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');
const I_SOURCE = Symbol('.#source');
const I_SOURCE_READER = Symbol('.#sourceReader');
const I_BUFFER_STASH = Symbol('.#bufferStash');
const I_DESTROYED = Symbol('.#destroyed');
const I_PULLING = Symbol('.#pulling');
const I_SOURCE_DONE = Symbol('.#sourceDone');
const I_SOURCE_ERROR = Symbol('.#sourceError');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
  SOURCE: I_SOURCE,
  SOURCE_READER: I_SOURCE_READER,
  BUFFER_STASH: I_BUFFER_STASH,
  DESTROYED: I_DESTROYED,
  PULLING: I_PULLING,
  SOURCE_DONE: I_SOURCE_DONE,
  SOURCE_ERROR: I_SOURCE_ERROR,
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
