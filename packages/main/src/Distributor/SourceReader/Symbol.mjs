import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_STREAM = Symbol('.#stream');
const I_READER = Symbol('.#reader');
const I_PULLING = Symbol('.#pulling');
const I_DONE = Symbol('.#done');
const I_ERROR = Symbol('.#error');

export const I = deepFreeze({
  STREAM: I_STREAM,
  READER: I_READER,
  PULLING: I_PULLING,
  DONE: I_DONE,
  ERROR: I_ERROR,
});
