import { deepFreeze } from '@produck/deep-freeze-enumerable';

const _I_READ = Symbol('._read()');

export const _I = deepFreeze({
  READ: _I_READ,
});

const I_CONSTRUCTOR = Symbol('.#constructor');
const I_SOURCE = Symbol('.#source');
const I_READER = Symbol('.#reader');
const I_BUFFER = Symbol('.#buffer');
const I_BUFFER_SIZE = Symbol('.#bufferSize');
const I_FILE_HANDLE = Symbol('.#fileHandle');
const I_TMPFILE_PATH = Symbol('.#tmpfilePath');
const I_COMMITTED_CHUNKS = Symbol('.#committedChunks');
const I_IN_FILE_PHASE = Symbol('.#inFilePhase');
const I_DESTROYED = Symbol('.#destroyed');
const I_PULLING = Symbol('.#pulling');
const I_SOURCE_DONE = Symbol('.#sourceDone');
const I_SOURCE_ERROR = Symbol('.#sourceError');
const I_TOTAL_CHUNKS = Symbol('.#totalChunks');

const $I_COPIES = Symbol('.$copies');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
  SOURCE: I_SOURCE,
  READER: I_READER,
  BUFFER: I_BUFFER,
  BUFFER_SIZE: I_BUFFER_SIZE,
  FILE_HANDLE: I_FILE_HANDLE,
  TMPFILE_PATH: I_TMPFILE_PATH,
  COMMITTED_CHUNKS: I_COMMITTED_CHUNKS,
  IN_FILE_PHASE: I_IN_FILE_PHASE,
  DESTROYED: I_DESTROYED,
  PULLING: I_PULLING,
  SOURCE_DONE: I_SOURCE_DONE,
  SOURCE_ERROR: I_SOURCE_ERROR,
  TOTAL_CHUNKS: I_TOTAL_CHUNKS,
});

export const $I = deepFreeze({
  COPIES: $I_COPIES,
});
