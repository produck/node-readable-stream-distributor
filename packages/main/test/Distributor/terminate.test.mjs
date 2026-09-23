import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { drain, makeSource, TestDistributor } from '#test/baseline.mjs';

const EXPECTED = {
  TERMINATED: { message: /Distributor has been terminated/ },
};

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
