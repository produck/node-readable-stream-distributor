import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_INITIALIZED = Symbol('.#initialized');
const I_CLOSED = Symbol('.#closed');
const I_ERROR = Symbol('.#error');
const I_LEAF_CHUNK_COUNT = Symbol('.#leafChunkCount');
const I_INITIALIZE = Symbol('.#initialize()');
const I_SYNC = Symbol('.#sync()');

export const I = deepFreeze({
  INITIALIZED: I_INITIALIZED,
  CLOSED: I_CLOSED,
  ERROR: I_ERROR,
  LEAF_CHUNK_COUNT: I_LEAF_CHUNK_COUNT,
  INITIALIZE: I_INITIALIZE,
  SYNC: I_SYNC,
});

const $I_TRANSFERRER = Symbol('.$transferrer');
const $I_REQUEST_INITIALIZE = Symbol('.$requestInitialize()');
const $I_CLOSE = Symbol('.$close()');

export const $I = deepFreeze({
  TRANSFERRER: $I_TRANSFERRER,
  REQUEST_INITIALIZE: $I_REQUEST_INITIALIZE,
  CLOSE: $I_CLOSE,
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
