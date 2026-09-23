import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { drain, makeSource, TestDistributor } from '#test/baseline.mjs';

const EXPECTED = {
  ABORTED: {
    name: 'AbortError',
    message: /The distributor has been terminated/,
  },
};

describe('.destroy()', async () => {
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

  await import('./promise.test.mjs');
});
