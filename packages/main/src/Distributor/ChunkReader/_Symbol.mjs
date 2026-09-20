import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_SOURCE_CONSUMPTION_AGENT = Symbol('.#sourceConsumptionAgent');

export const I = deepFreeze({
  SOURCE_CONSUMPTION_AGENT: I_SOURCE_CONSUMPTION_AGENT,
});

const $I_CONSUMED_CHUNK_COUNT = Symbol('.$consumedChunkCount');
const $I_CHUNK_STASH = Symbol('.$chunkStash');
const $I_READ = Symbol('.$read()');
const $I_ENSURE_THEN_READ = Symbol('.$ensureThenRead()');
const $I_CLOSE = Symbol('.$close()');

export const $I = deepFreeze({
  CONSUMED_CHUNK_COUNT: $I_CONSUMED_CHUNK_COUNT,
  CHUNK_STASH: $I_CHUNK_STASH,
  READ: $I_READ,
  ENSURE_THEN_READ: $I_ENSURE_THEN_READ,
  CLOSE: $I_CLOSE,
});

const _I_READ = Symbol('._read()');

export const _I = deepFreeze({
  READ: _I_READ,
});

export const A = deepFreeze({
  I: {
    AGENT: I_SOURCE_CONSUMPTION_AGENT,
  },
  $I: {
    CONSUMED_COUNT: $I_CONSUMED_CHUNK_COUNT,
    STASH: $I_CHUNK_STASH,
  },
});
