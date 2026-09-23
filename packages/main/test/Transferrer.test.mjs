import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Options } from '@produck/readable-stream-distributor';

import {
  makeFamily,
  makeSource,
  settle,
  TestTransferrer,
} from '#test/baseline.mjs';

import { _I as HOST } from '../src/Distributor/DegradedChunkReader/Transferrer/_Symbol.mjs';

describe('Transferrer', () => {
  describe('constructor()', () => {
    it('should receive the parsed argument list', async () => {
      const family = makeFamily();
      const distributor = new family.Distributor(makeSource(['a']));
      const forked = distributor.fork();

      distributor.setTransferrerArgs('x', 'y');
      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      assert.deepEqual(family.created.at(-1).args, ['x', 'y']);
    });

    describe('>instance', () => {
      it('should start with nothing pending', () => {
        assert.equal(new TestTransferrer().pendingByteLength, 0);
      });

      it('should start not done, not dropped and without error', () => {
        const medium = new TestTransferrer();

        assert.equal(medium.done, false);
        assert.equal(medium.dropped, false);
        assert.equal(medium.error, null);
      });
    });
  });

  describe('.pendingByteLength', () => {
    it('should count only what came in after the hand-over', async () => {
      class HangingWriteTransferrer extends TestTransferrer {
        [HOST.WRITE]() {
          return new Promise(() => {});
        }
      }

      const family = makeFamily({ medium: HangingWriteTransferrer });
      const distributor = new family.Distributor(makeSource(['aa', 'bb']));
      const reading = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();
      await reading.read();

      const medium = family.created.at(-1);

      assert.equal(medium.pendingByteLength, 2);
    });

    it('should fall back as the drain writes', async () => {
      let releaseWrite = null;

      class SlowTransferrer extends TestTransferrer {
        async [HOST.WRITE](buffer) {
          await new Promise((resolve) => {
            releaseWrite = resolve;
          });

          await super[HOST.WRITE](buffer);
        }
      }

      const family = makeFamily({ medium: SlowTransferrer });
      const distributor = new family.Distributor(makeSource(['aa', 'bb']));
      const reading = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();

      const medium = family.created.at(-1);
      const rest = reading.read();

      await settle();
      assert.equal(medium.pendingByteLength, 2);

      releaseWrite();
      await settle();
      await rest;

      assert.equal(medium.pendingByteLength, 0);
    });

    it('should answer zero once the store is released', async () => {
      class HangingWriteTransferrer extends TestTransferrer {
        [HOST.WRITE]() {
          return new Promise(() => {});
        }
      }

      const family = makeFamily({ medium: HangingWriteTransferrer });
      const distributor = new family.Distributor(makeSource(['aa', 'bb']));
      const reading = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();
      await reading.read();

      const medium = family.created.at(-1);

      assert.equal(medium.pendingByteLength, 2);

      await distributor.destroy();

      assert.equal(medium.pendingByteLength, 0);
    });
  });

  describe('.dumping', () => {
    it('should be null before the stash is taken over', () => {
      assert.equal(new TestTransferrer().dumping, null);
    });

    it('should be the promise of the taking over, while it runs', async () => {
      let releaseDump = null;
      let settled = false;

      class SlowTransferrer extends TestTransferrer {
        [HOST.DUMP](stash) {
          return new Promise((resolve) => {
            releaseDump = () => {
              super[HOST.DUMP](stash);

              resolve();
            };
          });
        }
      }

      const family = makeFamily({ medium: SlowTransferrer });
      const distributor = new family.Distributor(makeSource(['a']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      forked.getReader().read();

      await settle();

      const medium = family.created.at(-1);

      assert.ok(medium.dumping instanceof Promise);

      medium.dumping.then(() => {
        settled = true;
      });

      await settle();
      assert.equal(settled, false);

      releaseDump();
      await medium.dumping;

      assert.equal(settled, true);
    });
  });

  describe('.done', () => {
    it('should turn true when the source had ended at the switch', async () => {
      const family = makeFamily();
      const distributor = new family.Distributor(makeSource(['a']));
      const reading = distributor.fork().getReader();

      Options.Tune.DegradeOnStashFullAndDone(distributor, true);
      Options.Tune.MaxStashByteLength(distributor, 1);

      await reading.read();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();

      assert.equal(distributor.degraded, true);
      assert.equal(family.created.at(-1).done, true);
    });

    it('should turn true when the distributor is destroyed', async () => {
      const family = makeFamily();
      const distributor = new family.Distributor(makeSource(['a', 'b']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      const medium = family.created.at(-1);

      assert.equal(medium.done, false);

      await distributor.destroy();

      assert.equal(medium.done, true);
    });
  });

  describe('.error', () => {
    it('should keep the first failure', async () => {
      const cause = new Error('the only failure');

      class FailingTransferrer extends TestTransferrer {
        async [HOST.WRITE]() {
          throw cause;
        }
      }

      const family = makeFamily({ medium: FailingTransferrer });
      const distributor = new family.Distributor(makeSource(['a', 'b', 'c']));
      const reading = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();

      const medium = family.created.at(-1);

      await reading.read().catch(() => {});

      assert.equal(medium.error, cause);

      await reading.read().catch(() => {});

      assert.equal(medium.error, cause);

      await distributor.destroy();

      assert.equal(medium.error, cause);
    });

    it('should be the cause of the rejected read', async () => {
      const cause = new Error('the medium failed');

      class FailingTransferrer extends TestTransferrer {
        async [HOST.DUMP]() {
          throw cause;
        }
      }

      const family = makeFamily({ medium: FailingTransferrer });
      const distributor = new family.Distributor(makeSource(['a']));
      const reading = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      assert.equal((await reading.read()).value.toString(), 'a');
      await assert.rejects(reading.read(), cause);
      assert.equal(family.created.at(-1).error, cause);
    });
  });

  describe('.dropped', () => {
    it('should turn true when the distributor releases the store', async () => {
      const family = makeFamily();
      const distributor = new family.Distributor(makeSource(['a', 'b']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      const medium = family.created.at(-1);

      assert.equal(medium.dropped, false);

      await distributor.destroy();

      assert.equal(medium.dropped, true);
    });

    it('should swallow a failure of the release', async () => {
      class RefusingDropTransferrer extends TestTransferrer {
        async [HOST.DROP]() {
          throw new Error('the medium refuses to release');
        }
      }

      const family = makeFamily({ medium: RefusingDropTransferrer });
      const distributor = new family.Distributor(makeSource(['a']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      const medium = family.created.at(-1);

      await distributor.destroy();

      assert.equal(medium.dropped, true);
    });

    it('should not wait for the medium to release its own resources', async () => {
      class HangingDropTransferrer extends TestTransferrer {
        [HOST.DROP]() {
          return new Promise(() => {});
        }
      }

      const family = makeFamily({ medium: HangingDropTransferrer });
      const distributor = new family.Distributor(makeSource(['a']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      const medium = family.created.at(-1);

      await distributor.destroy();

      assert.equal(medium.dropped, true);
    });
  });
});
