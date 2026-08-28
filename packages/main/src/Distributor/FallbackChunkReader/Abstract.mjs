import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, S, _S } from './Symbol.mjs';

// Fallback readers (e.g. file-backed) stop consuming the shared ChunkStash.
// Dumping lives on the static side: `_S.DUMP(chunkStash)` transfers the
// stash to the fallback store and drops it once (memory phase is over).
// `dump()` normalizes it to a Promise and records it in `S.DUMPING`;
// instance readers only await that barrier during init (blocking, no
// product), then read from their own store.
class AbstractFallbackChunkReader extends ChunkReader.Abstract {
  // The dumping barrier registry shared by every concrete fallback reader:
  // ChunkStash -> dumping Promise (weakly held).
  static [S.DUMPING] = new WeakMap();

  constructor(...args) {
    super(...args);

    // The actual concrete class, captured so the instance can reach its
    // own static members (e.g. the S.DUMPING registry).
    this[I.CONSTRUCTOR] = new.target;
  }

  // Public static: run the abstract dump, normalize to a Promise, and
  // record it in S.DUMPING so all instance readers await the same barrier.
  static dump(chunkStash) {
    const dumping = Promise.resolve().then(() => this[_S.DUMP](chunkStash));

    this[S.DUMPING].set(chunkStash, dumping);

    return dumping;
  }

  // Public instance: the dumping barrier for this reader's shared stash.
  getChunkStashDumping() {
    return this[I.CONSTRUCTOR][S.DUMPING].get(this[ChunkReader.$I.CHUNK_STASH]);
  }

  [ChunkReader._I.INITIALIZE]() {
    return this.getChunkStashDumping();
  }
}

export default Abstract(
  AbstractFallbackChunkReader,
  Abstract.Static({
    [_S.DUMP]: M.Method(),
  }),
);
