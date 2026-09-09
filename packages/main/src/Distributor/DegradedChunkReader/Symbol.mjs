import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSTRUCTOR = Symbol('.#constructor');
const I_INITIALIZED = Symbol('.#initialized');
const I_CLOSED = Symbol('.#closed');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
  INITIALIZED: I_INITIALIZED,
  CLOSED: I_CLOSED,
});

const $I_REQUEST_INITIALIZE = Symbol('.$requestInitialize()');
const $I_CLOSE = Symbol('.$close()');

export const $I = deepFreeze({
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

const S_TRANSFERRER = Symbol('S.transferrer');

export const S = deepFreeze({
  TRANSFERRER: S_TRANSFERRER,
});
