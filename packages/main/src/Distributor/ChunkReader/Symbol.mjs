import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CLOSED = Symbol('.#closed');
const I_INITIALIZED = Symbol('.#initialized');

export const I = deepFreeze({
  CLOSED: I_CLOSED,
  INITIALIZED: I_INITIALIZED,
});

const $I_CONSUMED = Symbol('.$consumed');
const $I_CHUNK_STASH = Symbol('.$chunkStash');
const $I_CLOSE = Symbol('.$close()');
const $I_READ = Symbol('.$read()');
const $I_REQUEST_INITIALIZE = Symbol('.$requestInitialize()');

export const $I = deepFreeze({
  CONSUMED: $I_CONSUMED,
  CHUNK_STASH: $I_CHUNK_STASH,
  CLOSE: $I_CLOSE,
  READ: $I_READ,
  REQUEST_INITIALIZE: $I_REQUEST_INITIALIZE,
});

const _I_READ = Symbol('._read()');
const _I_CLOSE = Symbol('._close()');
const _I_INITIALIZE = Symbol('._initialize()');

export const _I = deepFreeze({
  READ: _I_READ,
  CLOSE: _I_CLOSE,
  INITIALIZE: _I_INITIALIZE,
});
