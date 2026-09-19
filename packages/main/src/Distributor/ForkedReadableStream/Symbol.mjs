import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_LABEL = Symbol('.#label');
const I_DISTRIBUTOR = Symbol('.#distributor');
const I_CHUNK_READER = Symbol('.#chunkReader');
const I_DONE = Symbol('.#done');

export const I = deepFreeze({
  LABEL: I_LABEL,
  DISTRIBUTOR: I_DISTRIBUTOR,
  CHUNK_READER: I_CHUNK_READER,
  DONE: I_DONE,
});

const $I_CANCELLED = Symbol('.$cancelled');
const $I_CHUNK_READER = Symbol('.$chunkReader');
const $I_SET_DEGRADED_CHUNK_READER = Symbol('.$setDegradedChunkReader()');

export const $I = deepFreeze({
  CANCELLED: $I_CANCELLED,
  CHUNK_READER: $I_CHUNK_READER,
  SET_DEGRADED_CHUNK_READER: $I_SET_DEGRADED_CHUNK_READER,
});

export * as DISTRIBUTOR from '../Symbol.mjs';
