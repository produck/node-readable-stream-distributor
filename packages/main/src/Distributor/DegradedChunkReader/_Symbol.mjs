import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_INITIALIZED = Symbol('.#initialized');
const I_CLOSED = Symbol('.#closed');
const I_SEEKED_CHUNK_COUNT = Symbol('.#seekedChunkCount');
const I_INITIALIZE = Symbol('.#initialize()');
const I_SYNC = Symbol('.#sync()');
const I_READ_BACK = Symbol('.#readBack()');

export const I = deepFreeze({
  INITIALIZED: I_INITIALIZED,
  CLOSED: I_CLOSED,
  SEEKED_CHUNK_COUNT: I_SEEKED_CHUNK_COUNT,
  INITIALIZE: I_INITIALIZE,
  SYNC: I_SYNC,
  READ_BACK: I_READ_BACK,
});

const $I_TRANSFERRER = Symbol('.$transferrer');
const $I_REQUEST_INITIALIZE = Symbol('.$requestInitialize()');

export const $I = deepFreeze({
  TRANSFERRER: $I_TRANSFERRER,
  REQUEST_INITIALIZE: $I_REQUEST_INITIALIZE,
});

const _I_READ = Symbol('._read()');
const _I_INITIALIZE = Symbol('._initialize()');
const _I_CLOSE = Symbol('._close()');
const _I_SEEK = Symbol('._seek()');

export const _I = deepFreeze({
  READ: _I_READ,
  INITIALIZE: _I_INITIALIZE,
  CLOSE: _I_CLOSE,
  SEEK: _I_SEEK,
});

const _S_TRANSFERRER_CTOR = Symbol('._transferrerCtor');

export const _S = deepFreeze({
  TRANSFERRER_CTOR: _S_TRANSFERRER_CTOR,
});

export const A = deepFreeze({
  I: {
    SEEKED_COUNT: I_SEEKED_CHUNK_COUNT,
  },
});
