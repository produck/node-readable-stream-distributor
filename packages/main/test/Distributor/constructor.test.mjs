import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { makeSource, TestDistributor } from '#test/baseline.mjs';

const EXPECTED = {
  NOT_A_STREAM: {
    name: 'TypeError',
    message: /Invalid "source", one "a WHATWG ReadableStream"/,
  },
  LOCKED: { message: /Source stream must not be locked/ },
};

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
