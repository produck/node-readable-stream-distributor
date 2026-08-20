import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');
const I_SOURCE = Symbol('.#source');
const I_SOURCE_READER = Symbol('.#sourceReader');
const I_BUFFER = Symbol('.#buffer');
const I_BUFFER_SIZE = Symbol('.#bufferSize');
const I_COMMITTED_CHUNKS = Symbol('.#committedChunks');
const I_IN_FILE_PHASE = Symbol('.#inFilePhase');
const I_DESTROYED = Symbol('.#destroyed');
const I_PULLING = Symbol('.#pulling');
const I_SOURCE_DONE = Symbol('.#sourceDone');
const I_SOURCE_ERROR = Symbol('.#sourceError');
const I_TOTAL_CHUNKS = Symbol('.#totalChunks');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
  SOURCE: I_SOURCE,
  SOURCE_READER: I_SOURCE_READER,
  BUFFER: I_BUFFER,
  BUFFER_SIZE: I_BUFFER_SIZE,
  COMMITTED_CHUNKS: I_COMMITTED_CHUNKS,
  IN_FILE_PHASE: I_IN_FILE_PHASE,
  DESTROYED: I_DESTROYED,
  PULLING: I_PULLING,
  SOURCE_DONE: I_SOURCE_DONE,
  SOURCE_ERROR: I_SOURCE_ERROR,
  TOTAL_CHUNKS: I_TOTAL_CHUNKS,
});

const $I_COPIES = Symbol('.$copies');

export const $I = deepFreeze({
  COPIES: $I_COPIES,
});

const S_HIGH_WATER_MARK = Symbol('._highWaterMark()');

export const _S = deepFreeze({
  HIGH_WATER_MARK: S_HIGH_WATER_MARK,
});
