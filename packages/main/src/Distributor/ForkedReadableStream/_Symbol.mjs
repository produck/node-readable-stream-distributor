import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_LABEL = Symbol('.#label');
const I_CHUNK_READER = Symbol('.#chunkReader');

export const I = deepFreeze({
  LABEL: I_LABEL,
  CHUNK_READER: I_CHUNK_READER,
});

const $I_CHUNK_READER = Symbol('.$chunkReader');
const $I_SET_DEGRADED_CHUNK_READER = Symbol('.$setDegradedChunkReader()');

export const $I = deepFreeze({
  CHUNK_READER: $I_CHUNK_READER,
  SET_DEGRADED_CHUNK_READER: $I_SET_DEGRADED_CHUNK_READER,
});

export const A = deepFreeze({
  I: {
    READER: I_CHUNK_READER,
  },
  $I: {
    READER: $I_CHUNK_READER,
  },
});
