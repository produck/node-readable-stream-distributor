import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');
const I_SOURCE_READER = Symbol('.#sourceReader');
const I_SOURCE_CONSUMPTION_AGENT = Symbol('.#sourceConsumptionAgent');
const I_CHUNK_STASH = Symbol('.#chunkStash');
const I_DESTROYED = Symbol('.#destroyed');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
  SOURCE_READER: I_SOURCE_READER,
  SOURCE_CONSUMPTION_AGENT: I_SOURCE_CONSUMPTION_AGENT,
  CHUNK_STASH: I_CHUNK_STASH,
  DESTROYED: I_DESTROYED,
});

const $I_REGISTRY = Symbol('.$registry');
const $I_PRUNE = Symbol('.$prune()');
const $I_DEGRADE = Symbol('.$degrade()');

export const $I = deepFreeze({
  REGISTRY: $I_REGISTRY,
  PRUNE: $I_PRUNE,
  DEGRADE: $I_DEGRADE,
});

const S_HIGH_WATER_MARK = Symbol('._highWaterMark()');

export const _S = deepFreeze({
  HIGH_WATER_MARK: S_HIGH_WATER_MARK,
});
