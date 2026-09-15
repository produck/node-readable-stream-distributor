import { deepFreeze } from '@produck/deep-freeze-enumerable';

const I_CTOR = Symbol('.#ctor');
const I_SOURCE_READER = Symbol('.#sourceReader');
const I_SOURCE_CONSUMPTION_AGENT = Symbol('.#sourceConsumptionAgent');
const I_CHUNK_STASH = Symbol('.#chunkStash');
const I_DEGRADED_CHUNK_READER_CTOR = Symbol('.#degradedChunkReaderCtor');
const I_TRANSFERRER_ARGS = Symbol('.#transferrerArgs');
const I_TRANSFERRER_CTOR = Symbol('.#transferrerCtor');
const I_DESTROYED = Symbol('.#destroyed');

export const I = deepFreeze({
  CTOR: I_CTOR,
  SOURCE_READER: I_SOURCE_READER,
  SOURCE_CONSUMPTION_AGENT: I_SOURCE_CONSUMPTION_AGENT,
  CHUNK_STASH: I_CHUNK_STASH,
  DEGRADED_CHUNK_READER_CTOR: I_DEGRADED_CHUNK_READER_CTOR,
  TRANSFERRER_ARGS: I_TRANSFERRER_ARGS,
  TRANSFERRER_CTOR: I_TRANSFERRER_CTOR,
  DESTROYED: I_DESTROYED,
});

const $I_REGISTRY = Symbol('.$registry');
const $I_TRANSFERRER = Symbol('.$transferrer');
const $I_SET_TRANSFERRER_ARGS = Symbol('.$setTransferrerArgs()');
const $I_PRUNE = Symbol('.$prune()');
const $I_DEGRADE = Symbol('.$degrade()');

export const $I = deepFreeze({
  REGISTRY: $I_REGISTRY,
  TRANSFERRER: $I_TRANSFERRER,
  SET_TRANSFERRER_ARGS: $I_SET_TRANSFERRER_ARGS,
  PRUNE: $I_PRUNE,
  DEGRADE: $I_DEGRADE,
});

const S_STASH_BYTE_LIMIT = Symbol('._stashByteLimit()');
const S_DEGRADED_CHUNK_READER_CTOR = Symbol('._degradedChunkReaderCtor');

export const _S = deepFreeze({
  STASH_BYTE_LIMIT: S_STASH_BYTE_LIMIT,
  DEGRADED_CHUNK_READER_CTOR: S_DEGRADED_CHUNK_READER_CTOR,
});
