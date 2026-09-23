import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeSource, TestDistributor } from '../baseline.mjs';

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
