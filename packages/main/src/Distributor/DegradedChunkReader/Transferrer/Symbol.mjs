import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_DUMPING = Symbol('.#dumping');
const I_PENDING_CHUNKS = Symbol('.#pendingChunks');
const I_PENDING_BYTE_LENGTH = Symbol('.#pendingByteLength');
const I_WRITTEN_CHUNK_COUNT = Symbol('.#writtenChunkCount');
const I_PROGRESS = Symbol('.#progress');
const I_DRAINING = Symbol('.#draining');
const I_ERROR = Symbol('.#error');
const I_DONE = Symbol('.#done');
const I_ADVANCE = Symbol('.#advance()');
const I_FAIL = Symbol('.#fail()');

export const I = deepFreeze({
  DUMPING: I_DUMPING,
  PENDING_CHUNKS: I_PENDING_CHUNKS,
  PENDING_BYTE_LENGTH: I_PENDING_BYTE_LENGTH,
  WRITTEN_CHUNK_COUNT: I_WRITTEN_CHUNK_COUNT,
  PROGRESS: I_PROGRESS,
  DRAINING: I_DRAINING,
  ERROR: I_ERROR,
  DONE: I_DONE,
  ADVANCE: I_ADVANCE,
  FAIL: I_FAIL,
});

const $I_DUMP = Symbol('.$dump()');
const $I_START_DUMPING = Symbol('.$startDumping()');
const $I_WRITE = Symbol('.$write()');
const $I_SET_DONE = Symbol('.$setDone()');
const $I_WAIT_CHUNK = Symbol('.$waitChunk()');
const $I_PEEK_CHUNK = Symbol('.$peekChunk()');
const $I_WAIT_DUMPING = Symbol('.$waitDumping()');

export const $I = deepFreeze({
  DUMP: $I_DUMP,
  START_DUMPING: $I_START_DUMPING,
  WRITE: $I_WRITE,
  SET_DONE: $I_SET_DONE,
  WAIT_CHUNK: $I_WAIT_CHUNK,
  PEEK_CHUNK: $I_PEEK_CHUNK,
  WAIT_DUMPING: $I_WAIT_DUMPING,
});

const _I_DUMP = Symbol('._dump()');
const _I_WRITE = Symbol('._write()');

export const _I = deepFreeze({
  DUMP: _I_DUMP,
  WRITE: _I_WRITE,
});
