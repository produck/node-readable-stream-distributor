import { deepFreeze } from '@produck/deep-freeze-enumerable';

// Instance private: the actual class, captured via new.target in the
// constructor so an instance can reach its own static members.
const I_CONSTRUCTOR = Symbol('.#constructor');

export const I = deepFreeze({
  CONSTRUCTOR: I_CONSTRUCTOR,
});

// Static: dumping barrier registry (ChunkStash -> dumping Promise).
const S_DUMPING = Symbol('S.dumping');

export const S = deepFreeze({
  DUMPING: S_DUMPING,
});

// Abstract static: transfer the ChunkStash to the fallback store and drop it.
const _S_DUMP = Symbol('._dump()');

export const _S = deepFreeze({
  DUMP: _S_DUMP,
});
