import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Distributor, Options, SYMBOL } from '../src/index.mjs';

import {
  drain,
  makeFamily,
  makeSource,
  settle,
  TestDegradedChunkReader,
  TestDistributor,
  TestTransferrer,
} from './baseline.mjs';

const { _I: READER } = SYMBOL.DEGRADED_CHUNK_READER;
const { _I: TRANSFERRER, _S: TRANSFERRER_S } = SYMBOL.TRANSFERRER;

const EXPECTED = {
  NOT_A_STREAM: {
    name: 'TypeError',
    message: /Invalid "source", one "a WHATWG ReadableStream"/,
  },
  LOCKED: { message: /Source stream must not be locked/ },
  NOT_A_STRING: {
    name: 'TypeError',
    message: /Invalid "label", one "a string" expected\./,
  },
  UNIMPLEMENTED: { message: /must be implemented in the subclass/ },
  CONSUMED: { message: /Transferrer args have been consumed/ },
  TERMINATED: { message: /Distributor has been terminated/ },
  ABORTED: {
    name: 'AbortError',
    message: /The distributor has been terminated/,
  },
};

describe('Distributor', () => {
  describe('constructor()', () => {
    it('should reject a source that is not a ReadableStream', () => {
      const badSources = [null, {}, { locked: false }];

      for (const source of badSources) {
        const attempt = () => new TestDistributor(source);
        const where = `source: ${JSON.stringify(source)}`;

        assert.throws(attempt, EXPECTED.NOT_A_STREAM, where);
      }
    });

    it('should reject a locked source', () => {
      const source = makeSource();
      const reader = source.getReader();

      assert.throws(() => new TestDistributor(source), EXPECTED.LOCKED);

      reader.releaseLock();
    });

    describe('>instance', () => {
      it('should start in the memory phase', () => {
        const distributor = new TestDistributor(makeSource());

        assert.equal(distributor.degraded, false);
      });
    });
  });

  describe('.fork()', () => {
    it('should reject a label that is not a string', () => {
      const distributor = new TestDistributor(makeSource());

      assert.throws(() => distributor.fork(42), EXPECTED.NOT_A_STRING);
    });

    it('should accept an omitted label', () => {
      const distributor = new TestDistributor(makeSource());

      assert.doesNotThrow(() => distributor.fork());
    });

    it('should throw once terminated', () => {
      const distributor = new TestDistributor(makeSource());
      let forked = 0;

      distributor.addEventListener('fork', () => forked++);
      distributor.terminate();

      const attempt = () => distributor.fork();

      assert.throws(attempt, EXPECTED.TERMINATED);
      assert.equal(forked, 0);
    });

    it('should report the missing DEGRADED_CHUNK_READER_CTOR', () => {
      class Unfinished extends Distributor {}

      const unfinished = new Unfinished(makeSource());
      const attempt = () => unfinished.fork();

      assert.throws(attempt, EXPECTED.UNIMPLEMENTED);
    });

    it('should work as well after a switch', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const first = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await first.read();
      assert.equal(distributor.degraded, true);

      const second = distributor.fork();

      assert.deepEqual(await drain(second), []);
    });

    it('should dispatch the fork event once', () => {
      // TODO
    });
  });

  describe('.degraded', () => {
    it('should be false while the stash holds the data', () => {
      // TODO
    });

    it('should turn true on the pull that crossed MaxStashByteLength', () => {
      // TODO
    });

    it('should turn true at the limit even when the source is done', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const reader = distributor.fork().getReader();

      Options.Tune.DegradeOnStashFullAndDone(distributor, true);
      Options.Tune.MaxStashByteLength(distributor, 1);

      await reader.read();
      assert.equal(distributor.degraded, false);

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reader.read();
      assert.equal(distributor.degraded, true);
    });

    it('should follow DegradeOnStashFullAndDone for a full, ended stash', () => {
      // TODO
    });

    it('should stay false, rejecting the read, when the family is unfinished', () => {
      // TODO
    });

    it('should dispatch the degrade event on the crossing pull', () => {
      // TODO
    });

    it('should dispatch the degrade event with degraded already true', () => {
      // TODO
    });

    it('should not dispatch the degrade event again on later pulls', () => {
      // TODO
    });

    it('should dispatch warn(dump-failed) when the dump fails', async () => {
      const refused = new Error('the medium refuses the dump');

      class RefusingTransferrer extends TestTransferrer {
        [TRANSFERRER.DUMP]() {
          throw refused;
        }
      }

      const family = makeFamily({ medium: RefusingTransferrer });
      const distributor = new family.Distributor(makeSource(['a']));
      const reader = distributor.fork().getReader();
      const warns = [];
      const onWarn = (event) => warns.push(event.detail);

      distributor.addEventListener('warn', onWarn);
      Options.Tune.MaxStashByteLength(distributor, 0);

      await reader.read();
      await settle();

      assert.equal(warns.length, 1);
      assert.equal(warns[0].code, 'dump-failed');
      assert.match(warns[0].payload.message, /Failed to dump the ChunkStash/);
      assert.equal(warns[0].payload.cause, refused);
    });

    it('should dispatch warn(backlog) once the backlog is over the limit', () => {
      // TODO
    });
  });

  describe('.terminated', () => {
    it('should be false by default', () => {
      const distributor = new TestDistributor(makeSource());

      assert.equal(distributor.terminated, false);
    });

    it('should turn true after terminate()', () => {
      const distributor = new TestDistributor(makeSource());

      distributor.terminate();

      assert.equal(distributor.terminated, true);
    });
  });

  describe('.options', () => {
    it('should answer every item of the config surface', () => {
      const distributor = new TestDistributor(makeSource());
      const snapshot = distributor.options;
      const items = [
        'DegradeOnStashFullAndDone',
        'ForkHighWaterMark',
        'MaxBacklogWarningByteLength',
        'MaxStashByteLength',
      ];

      assert.deepEqual(Object.keys(snapshot).sort(), items);
    });

    it('should build a fresh snapshot on every read', () => {
      const distributor = new TestDistributor(makeSource());

      const first = distributor.options;
      const second = distributor.options;

      assert.notEqual(first, second);
      assert.deepEqual(first, second);
    });

    it('should answer what Tune wrote', () => {
      const distributor = new TestDistributor(makeSource());

      Options.Tune.MaxStashByteLength(distributor, 4);

      assert.equal(distributor.options.MaxStashByteLength, 4);
    });
  });

  describe('.setTransferrerArgs()', () => {
    it('should hand the whole argument array to PARSE_ARGUMENTS', async () => {
      const parsed = [];

      class ParsingTransferrer extends TestTransferrer {}

      ParsingTransferrer[TRANSFERRER_S.PARSE_ARGUMENTS] = (args) => {
        parsed.push(args);

        return args.map((arg) => `${arg}!`);
      };

      const family = makeFamily({ medium: ParsingTransferrer });
      const distributor = new family.Distributor(makeSource(['a']));
      const reader = distributor.fork().getReader();

      distributor.setTransferrerArgs('x', 'y');
      Options.Tune.MaxStashByteLength(distributor, 0);

      await reader.read();

      assert.deepEqual(parsed, [['x', 'y']]);
      assert.deepEqual(family.created.at(-1).args, ['x!', 'y!']);
    });

    it('should pass the array through when the medium kept the default', async () => {
      const family = makeFamily();
      const distributor = new family.Distributor(makeSource(['a']));
      const reader = distributor.fork().getReader();

      distributor.setTransferrerArgs('x', 'y');
      Options.Tune.MaxStashByteLength(distributor, 0);

      await reader.read();

      assert.deepEqual(family.created.at(-1).args, ['x', 'y']);
    });

    it('should keep the arguments for the switch', async () => {
      const family = makeFamily();
      const distributor = new family.Distributor(makeSource(['a']));
      const reader = distributor.fork().getReader();

      distributor.setTransferrerArgs('first');
      distributor.setTransferrerArgs('second', 'third');

      assert.equal(family.created.length, 0);

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reader.read();

      assert.deepEqual(family.created.at(-1).args, ['second', 'third']);
    });

    it('should throw once degraded', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const reader = distributor.fork().getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reader.read();

      assert.equal(distributor.degraded, true);

      const attempt = () => distributor.setTransferrerArgs('x');

      assert.throws(attempt, EXPECTED.CONSUMED);
    });
  });

  describe('.terminate()', () => {
    it('should refuse new forks', () => {
      const distributor = new TestDistributor(makeSource());

      distributor.terminate();

      const attempt = () => distributor.fork();

      assert.throws(attempt, EXPECTED.TERMINATED);
    });

    it('should let running copies read the source to its end', async () => {
      const distributor = new TestDistributor(makeSource(['a', 'b']));
      const forked = distributor.fork();

      distributor.terminate();

      assert.deepEqual(await drain(forked), ['a', 'b']);
    });

    it('should be idempotent', () => {
      const distributor = new TestDistributor(makeSource());

      distributor.terminate();

      const again = () => distributor.terminate();

      assert.doesNotThrow(again);
      assert.equal(distributor.terminated, true);
    });

    it('should dispatch the terminate event once', () => {
      const distributor = new TestDistributor(makeSource());
      const types = [];
      const onTerminate = (event) => types.push(event.type);

      distributor.addEventListener('terminate', onTerminate);

      distributor.terminate();
      distributor.terminate();

      assert.deepEqual(types, ['terminate']);
    });
  });

  describe('.destroy()', () => {
    it('should error every live copy at once', async () => {
      const distributor = new TestDistributor(makeSource(['a', 'b']));
      const copies = [distributor.fork(), distributor.fork()];

      distributor.destroy();

      const aborted = copies.map((copy) =>
        assert.rejects(drain(copy), EXPECTED.ABORTED),
      );

      await Promise.all(aborted);
    });

    it('should be idempotent and answer one promise', async () => {
      const distributor = new TestDistributor(makeSource());

      const first = distributor.destroy();
      const second = distributor.destroy();

      assert.equal(first, second);
      assert.equal(await first, undefined);
    });

    describe('>promise', () => {
      it('should settle after the source is cancelled', async () => {
        let reason = null;
        const source = new ReadableStream({
          cancel(cause) {
            reason = cause;
          },
        });
        const distributor = new TestDistributor(source);

        await distributor.destroy();

        assert.equal(reason.name, EXPECTED.ABORTED.name);
        assert.match(reason.message, EXPECTED.ABORTED.message);
      });

      it('should find the store sealed and released', async () => {
        const family = makeFamily();
        const distributor = new family.Distributor(makeSource(['a']));
        const reader = distributor.fork().getReader();

        Options.Tune.MaxStashByteLength(distributor, 0);
        await reader.read();

        const medium = family.created.at(-1);

        await distributor.destroy();

        assert.equal(medium.done, true);
        assert.equal(medium.dropped, true);
      });

      it('should not wait for a reader to close', async () => {
        const closed = [];

        class HangingReader extends TestDegradedChunkReader {
          [READER.READ]() {
            return new Promise(() => {});
          }

          [READER.CLOSE]() {
            closed.push(this);

            return new Promise(() => {});
          }
        }

        const family = makeFamily({ reader: HangingReader });
        const distributor = new family.Distributor(makeSource(['a']));
        const reader = distributor.fork().getReader();
        const reading = reader.read();

        Options.Tune.MaxStashByteLength(distributor, 0);

        await settle();
        await distributor.destroy();

        assert.equal(closed.length, 1);
        await assert.rejects(reading, EXPECTED.ABORTED);
      });

      it('should dispatch warn(source-cancel-failed) when it refuses', async () => {
        const cause = new Error('the source refuses to be cancelled');
        const warns = [];
        const onWarn = (event) => warns.push(event.detail);

        const source = new ReadableStream({
          cancel() {
            throw cause;
          },
        });

        const distributor = new TestDistributor(source);

        distributor.addEventListener('warn', onWarn);

        await distributor.destroy();

        assert.equal(warns.length, 1);
        assert.equal(warns[0].code, 'source-cancel-failed');
        assert.equal(warns[0].payload, cause);
      });
    });
  });
});
