import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Distributor, Options } from '@produck/readable-stream-distributor';

import { drain, makeSource, TestDistributor } from '#test/baseline.mjs';

const EXPECTED = {
  NOT_A_STRING: {
    name: 'TypeError',
    message: /Invalid "label", one "a string" expected\./,
  },
  UNIMPLEMENTED: { message: /must be implemented in the subclass/ },
  TERMINATED: { message: /Distributor has been terminated/ },
};

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
