import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_STREAM = Symbol('.#stream');
const I_READER = Symbol('.#reader');
const I_DONE = Symbol('.#done');
const I_ERROR = Symbol('.#error');
const I_CANCELLED = Symbol('.#cancelled');
const I_CONSUMED_CHUNK_COUNT = Symbol('.#consumedChunkCount');

export const I = deepFreeze({
  STREAM: I_STREAM,
  READER: I_READER,
  DONE: I_DONE,
  ERROR: I_ERROR,
  CANCELLED: I_CANCELLED,
  CONSUMED_CHUNK_COUNT: I_CONSUMED_CHUNK_COUNT,
});
