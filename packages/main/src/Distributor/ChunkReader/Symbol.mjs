import { deepFreeze } from '@produck/deep-freeze-enumerable';

const $I_CONSUMED = Symbol('.$consumed');
const $I_PULLER = Symbol('.$puller');
const $I_CHUNK_STASH = Symbol('.$chunkStash');
const $I_READ = Symbol('.$read()');

export const $I = deepFreeze({
  CONSUMED: $I_CONSUMED,
  PULLER: $I_PULLER,
  CHUNK_STASH: $I_CHUNK_STASH,
  READ: $I_READ,
});

const _I_READ = Symbol('._read()');

export const _I = deepFreeze({
  READ: _I_READ,
});
