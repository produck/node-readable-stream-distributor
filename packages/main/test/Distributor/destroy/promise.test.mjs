import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Options, SYMBOL } from '@produck/readable-stream-distributor';

import {
  makeFamily,
  makeSource,
  settle,
  TestDegradedChunkReader,
  TestDistributor,
  TestTransferrer,
} from '#test/baseline.mjs';

const { _I: READER } = SYMBOL.DEGRADED_CHUNK_READER;
const { _I: TRANSFERRER } = SYMBOL.TRANSFERRER;

const EXPECTED = {
  ABORTED: {
    name: 'AbortError',
    message: /The distributor has been terminated/,
  },
};

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

  it('should dispatch warn(pull-failed) for the in-flight pull', async () => {
    const cause = new Error('the source read failed');
    const warns = [];
    let fail = null;
    const source = {
      [Symbol.toStringTag]: 'ReadableStream',
      locked: false,
      getReader() {
        return {
          read() {
            return new Promise((_, reject) => {
              fail = reject;
            });
          },
          cancel() {
            return Promise.resolve();
          },
        };
      },
    };
    const distributor = new TestDistributor(source);
    const aborted = distributor
      .fork()
      .getReader()
      .read()
      .catch((r) => r);

    distributor.addEventListener('warn', (event) => warns.push(event.detail));

    await settle();

    const destroying = distributor.destroy();

    await settle();
    fail(cause);
    await destroying;

    assert.deepEqual(
      warns.map((warn) => warn.code),
      ['pull-failed'],
    );
    assert.equal(warns[0].payload, cause);

    const failure = await aborted;

    assert.equal(failure.name, EXPECTED.ABORTED.name);
    assert.match(failure.message, EXPECTED.ABORTED.message);
  });

  it('should dispatch warn(drop-failed) when the release fails', async () => {
    const cause = new Error('the medium refuses to release');

    class RefusingDropTransferrer extends TestTransferrer {
      [TRANSFERRER.DROP]() {
        throw cause;
      }
    }

    const family = makeFamily({ medium: RefusingDropTransferrer });
    const distributor = new family.Distributor(makeSource(['a']));
    const warns = [];

    distributor.addEventListener('warn', (event) => warns.push(event.detail));

    Options.Tune.MaxStashByteLength(distributor, 0);

    await distributor.fork().getReader().read();
    assert.equal(distributor.degraded, true);

    await distributor.destroy();
    await settle();

    assert.deepEqual(
      warns.map((warn) => warn.code),
      ['drop-failed'],
    );
    assert.equal(warns[0].payload, cause);
  });
});
