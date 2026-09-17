import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_DUMPING = Symbol('.#dumping');
const I_PENDING_CHUNKS = Symbol('.#pendingChunks');
const I_WRITTEN_CHUNK_COUNT = Symbol('.#writtenChunkCount');
const I_WAITERS = Symbol('.#waiters');
const I_DRAINING = Symbol('.#draining');
const I_ERROR = Symbol('.#error');
const I_DONE = Symbol('.#done');
const I_SETTLE = Symbol('.#settle()');
const I_FAIL = Symbol('.#fail()');

export const I = deepFreeze({
  DUMPING: I_DUMPING,
  PENDING_CHUNKS: I_PENDING_CHUNKS,
  WRITTEN_CHUNK_COUNT: I_WRITTEN_CHUNK_COUNT,
  WAITERS: I_WAITERS,
  DRAINING: I_DRAINING,
  ERROR: I_ERROR,
  DONE: I_DONE,
  SETTLE: I_SETTLE,
  FAIL: I_FAIL,
});

const $I_DUMP = Symbol('.$dump()');
const $I_START_DUMPING = Symbol('.$startDumping()');
const $I_WRITE = Symbol('.$write()');
const $I_SET_DONE = Symbol('.$setDone()');
const $I_WAIT_CHUNK = Symbol('.$waitChunk()');
const $I_PEEK = Symbol('.$peek()');

export const $I = deepFreeze({
  DUMP: $I_DUMP,
  START_DUMPING: $I_START_DUMPING,
  WRITE: $I_WRITE,
  SET_DONE: $I_SET_DONE,
  WAIT_CHUNK: $I_WAIT_CHUNK,
  PEEK: $I_PEEK,
});

const _I_DUMP = Symbol('._dump()');
const _I_WRITE = Symbol('._write()');

export const _I = deepFreeze({
  DUMP: _I_DUMP,
  WRITE: _I_WRITE,
});
