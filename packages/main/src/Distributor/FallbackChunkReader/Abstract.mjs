import Abstract, { Member as M } from '@produck/es-abstract';

import AbstractChunkReader from '../ChunkReader/Abstract.mjs';
import { $I, _I } from '../ChunkReader/Symbol.mjs';

// Fallback readers (e.g. file-backed) stop consuming the shared ChunkStash.
// Whatever the concrete fallback storage is, switching always performs the
// same routine: open/fill the fallback store, then drop the ChunkStash once
// (memory phase is over for good). This intermediate abstract layer enforces
// that common routine as a template; subclasses only implement `_I.OPEN`
// plus the inherited `_I.READ` / `_I.CLOSE` for their concrete storage.
class AbstractFallbackChunkReader extends AbstractChunkReader {
  [_I.INITIALIZE]() {
    return this[_I.OPEN]().then(() => {
      this[$I.CHUNK_STASH].drop();
    });
  }
}

export default Abstract(
  AbstractFallbackChunkReader,
  Abstract({
    [_I.OPEN]: M.Method(),
  }),
);
