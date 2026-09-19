import * as Ow from '@produck/ow';
import Abstract, { Member as M } from '@produck/es-abstract';

import { I, $I, _I, A } from './_Symbol.mjs';
import { _A } from './_External.mjs';

const noop = () => {};

class AbstractTransferrer {
  [A.I.WRITTEN_COUNT] = 0;
  [I.PENDING_CHUNKS] = [];
  [I.PENDING_RELEASES] = new Map();
  [I.DRAINING] = null;
  [I.DUMPING] = null;
  [I.ERROR] = null;
  [I.DONE] = false;

  [I.SETTLE]() {
    const pendingReleases = this[I.PENDING_RELEASES];

    if (pendingReleases.size === 0) {
      return;
    }

    const total = this[A.I.WRITTEN_COUNT] + this[I.PENDING_CHUNKS].length;
    const isTerminal = this[I.DONE] || this[I.ERROR] !== null;

    for (const [release, position] of pendingReleases) {
      if (position < total || isTerminal) {
        pendingReleases.delete(release);
        release();
      }
    }
  }

  [I.FAIL](cause) {
    this[I.ERROR] = cause;
    this[I.SETTLE]();
  }

  async [I.DRAIN]() {
    if (this[I.DUMPING] !== null) {
      await this[I.DUMPING].catch(noop);
    }

    if (this[I.ERROR] !== null) {
      return;
    }

    while (this[I.PENDING_CHUNKS].length > 0) {
      const buffer = this[I.PENDING_CHUNKS][0];

      await this[_I.WRITE](buffer).catch((cause) => this[I.FAIL](cause));

      if (this[I.ERROR] !== null) {
        break;
      }

      this[I.PENDING_CHUNKS].shift();
      this[A.I.WRITTEN_COUNT] += 1;
    }

    this[I.DRAINING] = null;
  }

  async [I.START_DUMPING](chunkStash) {
    this[I.PENDING_CHUNKS] = [...chunkStash.chunks()];

    const { length } = chunkStash;

    try {
      await this[_I.DUMP](chunkStash);
      chunkStash[_A.STASH.$I.DROP]();
      this[I.PENDING_CHUNKS].splice(0, length);
      this[A.I.WRITTEN_COUNT] = length;
      this[I.SETTLE]();
    } catch (cause) {
      this[I.FAIL](cause);
      // TODO: decide whether the taken-over list stays unreadable after a
      //   failed dump, as it is now, or is still handed out while the medium
      //   is dead.
      Ow.Error.Common('Failed to dump the ChunkStash.', { cause });
    }
  }

  [$I.DUMP](chunkStash) {
    return (this[I.DUMPING] = this[I.START_DUMPING](chunkStash));
  }

  [$I.WRITE](chunk) {
    if (this[I.ERROR] !== null) {
      Ow.throw(this[I.ERROR]);
    }

    this[I.PENDING_CHUNKS].push(chunk);
    this[I.SETTLE]();

    if (this[I.DRAINING] === null) {
      this[I.DRAINING] = this[I.DRAIN]();
    }
  }

  async [$I.WAIT_CHUNK](position) {
    const { promise, resolve } = Promise.withResolvers();

    this[I.PENDING_RELEASES].set(resolve, position);
    this[I.SETTLE]();
    await promise;

    if (this[I.ERROR] !== null) {
      Ow.throw(this[I.ERROR]);
    }
  }

  [$I.PEEK](position) {
    return this[I.PENDING_CHUNKS][position - this[A.I.WRITTEN_COUNT]];
  }

  [$I.SET_DONE]() {
    this[I.DONE] = true;
    this[I.SETTLE]();
  }

  get dumping() {
    return this[I.DUMPING];
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
