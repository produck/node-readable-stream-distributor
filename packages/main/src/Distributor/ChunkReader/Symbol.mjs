import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CONSUMED = Symbol('.#consumed');
const I_CLOSED = Symbol('.#closed');
const I_INITIALIZATION_STARTED = Symbol('.#initializationStarted');
const I_INITIALIZED = Symbol('.#initialized');

export const I = deepFreeze({
  CONSUMED: I_CONSUMED,
  CLOSED: I_CLOSED,
  INITIALIZATION_STARTED: I_INITIALIZATION_STARTED,
  INITIALIZED: I_INITIALIZED,
});

const $I_ID = Symbol('.$I.id');
const $I_PROGRESS = Symbol('.$I.progress');
const $I_BUFFER_LIST = Symbol('.$I.bufferList');
const $I_START_INITIALIZE = Symbol('.$I.startInitialize()');

export const $I = deepFreeze({
  ID: $I_ID,
  PROGRESS: $I_PROGRESS,
  BUFFER_LIST: $I_BUFFER_LIST,
  START_INITIALIZE: $I_START_INITIALIZE,
});

const _I_READ = Symbol('._read()');
const _I_CLOSE = Symbol('._close()');
const _I_INITIALIZE = Symbol('._initialize()');

export const _I = deepFreeze({
  READ: _I_READ,
  CLOSE: _I_CLOSE,
  INITIALIZE: _I_INITIALIZE,
});
