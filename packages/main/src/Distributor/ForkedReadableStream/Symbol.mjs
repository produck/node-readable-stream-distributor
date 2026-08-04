import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_LABEL = Symbol('.#label');
const I_DISTRIBUTOR = Symbol('.#distributor');
const I_STREAM = Symbol('.#stream');
const I_CONTROLLER = Symbol('.#controller');
const I_READER = Symbol('.#reader');
const I_CONSUMED = Symbol('.#consumed');
const I_CANCELLED = Symbol('.#cancelled');
const I_DONE = Symbol('.#done');

export const IForkedReadableStream = deepFreeze({
  LABEL: I_LABEL,
  DISTRIBUTOR: I_DISTRIBUTOR,
  STREAM: I_STREAM,
  CONTROLLER: I_CONTROLLER,
  READER: I_READER,
  CONSUMED: I_CONSUMED,
  CANCELLED: I_CANCELLED,
  DONE: I_DONE,
});
