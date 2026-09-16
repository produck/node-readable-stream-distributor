import * as Ow from '@produck/ow';
import Abstract, { Member as M } from '@produck/es-abstract';

import * as ChunkStash from '../../ChunkStash/index.mjs';
import { I, $I, _I } from './Symbol.mjs';

class AbstractTransferrer {
  [I.PENDING_CHUNKS] = [];
  [I.PENDING_BYTE_LENGTH] = 0;
  [I.WRITTEN_CHUNK_COUNT] = 0;
  [I.PROGRESS] = Promise.withResolvers();
  [I.DRAINING] = null;
  [I.DUMPING] = null;
  [I.ERROR] = null;
  [I.DONE] = false;

  [I.ADVANCE](writtenChunkCount) {
    this[I.WRITTEN_CHUNK_COUNT] = writtenChunkCount;

    const { resolve } = this[I.PROGRESS];

    this[I.PROGRESS] = Promise.withResolvers();
    resolve();
  }

  [I.FAIL](cause) {
    this[I.ERROR] = cause;
    this[I.ADVANCE](this[I.WRITTEN_CHUNK_COUNT]);
  }

  async [I.DRAIN]() {
    if (this[I.DUMPING] !== null) {
      await this[I.DUMPING].catch(() => {});
    }

    if (this[I.ERROR] !== null) {
      return;
    }

    while (this[I.PENDING_CHUNKS].length > 0) {
      const buffer = this[I.PENDING_CHUNKS][0];

      await this[_I.WRITE](buffer).catch((cause) => this[I.FAIL](cause));

      if (this[I.ERROR] !== null) {
        return;
      }

      this[I.PENDING_CHUNKS].shift();
      this[I.PENDING_BYTE_LENGTH] -= buffer.byteLength;
      this[I.ADVANCE](this[I.WRITTEN_CHUNK_COUNT] + 1);
    }
  }

  async [$I.START_DUMPING](chunkStash) {
    const { length, byteLength } = chunkStash;

    try {
      await this[_I.DUMP](chunkStash);
      chunkStash[ChunkStash.$I.DROP]();
      this[I.PENDING_CHUNKS].splice(0, length);
      this[I.PENDING_BYTE_LENGTH] -= byteLength;
      this[I.ADVANCE](length);
    } catch (cause) {
      this[I.FAIL](cause);
      // TODO: decide whether the queued scene (the fanned-in head plus the
      //   backlog) stays unreadable after a failed dump, as it is now, or is
      //   still handed out while the medium is dead.
      Ow.Error.Common('Failed to dump the ChunkStash.', { cause });
    }
  }

  [$I.DUMP](chunkStash) {
    this[I.PENDING_CHUNKS] = [
      ...chunkStash.chunks(),
      ...this[I.PENDING_CHUNKS],
    ];
    this[I.PENDING_BYTE_LENGTH] += chunkStash.byteLength;

    return (this[I.DUMPING] = this[$I.START_DUMPING](chunkStash));
  }

  [$I.WRITE](buffer) {
    if (this[I.ERROR] !== null) {
      throw this[I.ERROR];
    }

    this[I.PENDING_CHUNKS].push(buffer);
    this[I.PENDING_BYTE_LENGTH] += buffer.byteLength;

    if (this[I.DRAINING] === null) {
      this[I.DRAINING] = this[I.DRAIN]().finally(
        () => (this[I.DRAINING] = null),
      );
    }
  }

  async [$I.WAIT_CHUNK](position) {
    while (this[I.ERROR] === null) {
      const { promise } = this[I.PROGRESS];
      const total = this[I.WRITTEN_CHUNK_COUNT] + this[I.PENDING_CHUNKS].length;

      if (position < total) {
        return;
      }

      if (this[I.DONE]) {
        return;
      }

      await promise;
    }

    throw this[I.ERROR];
  }

  [$I.PEEK_CHUNK](position) {
    return this[I.PENDING_CHUNKS][position - this[I.WRITTEN_CHUNK_COUNT]];
  }

  [$I.WAIT_DUMPING]() {
    return this[I.DUMPING];
  }

  [$I.SET_DONE]() {
    this[I.DONE] = true;
    this[I.ADVANCE](this[I.WRITTEN_CHUNK_COUNT]);
  }

  get pendingChunkCount() {
    return this[I.PENDING_CHUNKS].length;
  }

  get pendingByteLength() {
    return this[I.PENDING_BYTE_LENGTH];
  }

  get writtenChunkCount() {
    return this[I.WRITTEN_CHUNK_COUNT];
  }

  get done() {
    return this[I.DONE];
  }

  get error() {
    return this[I.ERROR];
  }
}

export default Abstract(
  AbstractTransferrer,
  Abstract({
    [_I.DUMP]: M.Method(),
    [_I.WRITE]: M.Method(),
  }),
);
