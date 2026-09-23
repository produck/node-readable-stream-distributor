import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  Distributor,
  DegradedChunkReader,
  Options,
  SYMBOL,
} from '../src/index.mjs';

const { Tune, Get } = Options;
const { DEGRADED_CHUNK_READER_CTOR } = SYMBOL.DISTRIBUTOR._S;

const GIB = (1 << 10) ** 3;
const LIMIT = Number.MAX_SAFE_INTEGER;

const EXPECTED = {
  NON_NEGATIVE_INTEGER: {
    name: 'TypeError',
    message: /Invalid "member", one "non-negative integer" expected\./,
  },
  BOOLEAN: {
    name: 'TypeError',
    message: /Invalid "member", one "boolean" expected\./,
  },
  NUMBER: {
    name: 'RangeError',
    message: /Invalid "member", one "non-negative number" expected\./,
  },
  BIGINT: {
    name: 'TypeError',
    message: /Cannot convert a BigInt value to a number/,
  },
  SYMBOL: {
    name: 'TypeError',
    message: /Cannot convert a Symbol value to a number/,
  },
};

class TestDegradedChunkReader extends DegradedChunkReader {}

class TestDistributor extends Distributor {
  static [DEGRADED_CHUNK_READER_CTOR] = TestDegradedChunkReader;
}

function makeSource(chunks = []) {
  let pulled = 0;

  return new ReadableStream({
    pull(controller) {
      if (pulled < chunks.length) {
        controller.enqueue(Buffer.from(chunks[pulled]));
        pulled++;
      } else {
        controller.close();
      }
    },
  });
}

const makeDistributor = (chunks = []) =>
  new TestDistributor(makeSource(chunks));

const settle = async (turns = 6) => {
  for (let i = 0; i < turns; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

async function drain(stream) {
  const got = [];

  for await (const chunk of stream) {
    got.push(chunk.toString());
  }

  return got;
}

function countGetterReads(distributor, tune, value) {
  let reads = 0;

  tune(distributor, () => {
    reads++;

    return value;
  });

  reads = 0;

  return () => reads;
}

describe('Options', () => {
  describe('::Tune', () => {
    it('should store a plain value as a constant', () => {
      const distributor = makeDistributor();

      Tune.MaxStashByteLength(distributor, 8);

      assert.equal(Get.MaxStashByteLength(distributor), 8);
      assert.equal(Get.MaxStashByteLength(distributor), 8);
    });

    it('should store a function as the getter itself', () => {
      const distributor = makeDistributor();

      const derive = (options) => options.MaxStashByteLength(options) + 1;

      Tune.MaxStashByteLength(distributor, 16);
      Tune.MaxBacklogWarningByteLength(distributor, derive);

      assert.equal(Get.MaxBacklogWarningByteLength(distributor), 17);

      Tune.MaxStashByteLength(distributor, 20);
      assert.equal(Get.MaxBacklogWarningByteLength(distributor), 21);
    });

    it('should refuse a value the item assert rejects', () => {
      const distributor = makeDistributor();

      Tune.MaxStashByteLength(distributor, 4);

      const attempt = () => Tune.MaxStashByteLength(distributor, -1);

      assert.throws(attempt, EXPECTED.NON_NEGATIVE_INTEGER);
      assert.equal(Get.MaxStashByteLength(distributor), 4);
    });

    it('should change only the instance it was given', () => {
      const first = makeDistributor();
      const second = makeDistributor();

      Tune.MaxStashByteLength(first, 4);

      assert.equal(Get.MaxStashByteLength(first), 4);
      assert.equal(Get.MaxStashByteLength(second), GIB);
    });

    describe('::MaxStashByteLength()', () => {
      it('should refuse a negative value', () => {
        const distributor = makeDistributor();
        const attempt = () => Tune.MaxStashByteLength(distributor, -1);

        assert.throws(attempt, EXPECTED.NON_NEGATIVE_INTEGER);
      });

      it('should refuse a fractional value', () => {
        const distributor = makeDistributor();
        const attempt = () => Tune.MaxStashByteLength(distributor, 1.5);

        assert.throws(attempt, EXPECTED.NON_NEGATIVE_INTEGER);
      });
    });

    describe('::MaxBacklogWarningByteLength()', () => {
      it('should refuse a negative value', () => {
        const distributor = makeDistributor();
        const attempt = () => Tune.MaxBacklogWarningByteLength(distributor, -1);

        assert.throws(attempt, EXPECTED.NON_NEGATIVE_INTEGER);
      });
    });

    describe('::DegradeOnStashFullAndDone()', () => {
      it('should refuse a value that is not a boolean', () => {
        const distributor = makeDistributor();
        const attempt = () => Tune.DegradeOnStashFullAndDone(distributor, 1);

        assert.throws(attempt, EXPECTED.BOOLEAN);
      });

      it('should accept a boolean', () => {
        const distributor = makeDistributor();

        Tune.DegradeOnStashFullAndDone(distributor, true);
        assert.equal(Get.DegradeOnStashFullAndDone(distributor), true);

        Tune.DegradeOnStashFullAndDone(distributor, false);
        assert.equal(Get.DegradeOnStashFullAndDone(distributor), false);
      });
    });

    describe('::ForkHighWaterMark()', () => {
      it('should refuse a negative value', () => {
        const distributor = makeDistributor();
        const attempt = () => Tune.ForkHighWaterMark(distributor, -1);

        assert.throws(attempt, EXPECTED.NUMBER);
      });

      it('should refuse NaN', () => {
        const distributor = makeDistributor();
        const attempt = () => Tune.ForkHighWaterMark(distributor, NaN);

        assert.throws(attempt, EXPECTED.NUMBER);
      });

      it('should refuse a BigInt and a Symbol', () => {
        const distributor = makeDistributor();
        const fromBigInt = () => Tune.ForkHighWaterMark(distributor, 10n);
        const fromSymbol = () =>
          Tune.ForkHighWaterMark(distributor, Symbol('hwm'));

        assert.throws(fromBigInt, EXPECTED.BIGINT);
        assert.throws(fromSymbol, EXPECTED.SYMBOL);
      });

      it('should pass a numeric string and a boolean through', () => {
        const distributor = makeDistributor();

        Tune.ForkHighWaterMark(distributor, '3');
        assert.equal(Get.ForkHighWaterMark(distributor), '3');

        Tune.ForkHighWaterMark(distributor, true);
        assert.equal(Get.ForkHighWaterMark(distributor), true);
      });
    });
  });

  describe('::Get', () => {
    describe('::MaxStashByteLength()', () => {
      it('should default to 1 GiB', () => {
        assert.equal(Get.MaxStashByteLength(makeDistributor()), GIB);
      });

      it('should be read on every pull', async () => {
        const chunks = ['a', 'b', 'c'];
        const distributor = makeDistributor(chunks);
        const tune = Tune.MaxStashByteLength;
        const reads = countGetterReads(distributor, tune, LIMIT);
        const forked = distributor.fork();

        assert.deepEqual(await drain(forked), chunks);
        assert.equal(reads(), chunks.length + 1);
      });

      it('should stop being read once the phase has flipped', () => {
        // TODO
      });
    });

    describe('::MaxBacklogWarningByteLength()', () => {
      it('should default to what MaxStashByteLength answers', () => {
        assert.equal(Get.MaxBacklogWarningByteLength(makeDistributor()), GIB);
      });

      it('should follow MaxStashByteLength when it moves', () => {
        const distributor = makeDistributor();

        Tune.MaxStashByteLength(distributor, 5);
        assert.equal(Get.MaxBacklogWarningByteLength(distributor), 5);

        Tune.MaxStashByteLength(distributor, 9);
        assert.equal(Get.MaxBacklogWarningByteLength(distributor), 9);
      });

      it('should be read after every write to the medium', () => {
        // TODO
      });
    });

    describe('::DegradeOnStashFullAndDone()', () => {
      it('should default to false', () => {
        assert.equal(Get.DegradeOnStashFullAndDone(makeDistributor()), false);
      });

      it('should be read on the pull that crossed the limit', () => {
        // TODO
      });
    });

    describe('::ForkHighWaterMark()', () => {
      it('should default to 1', () => {
        assert.equal(Get.ForkHighWaterMark(makeDistributor()), 1);
      });

      it('should be read once per fork, at construction', () => {
        const distributor = makeDistributor();
        const reads = countGetterReads(distributor, Tune.ForkHighWaterMark, 1);

        distributor.fork();
        assert.equal(reads(), 1);

        distributor.fork();
        assert.equal(reads(), 2);
      });

      it('should be the queue depth of a fork', async () => {
        const distributor = makeDistributor(['a', 'b', 'c', 'd', 'e']);
        const tune = Tune.MaxStashByteLength;
        const reads = countGetterReads(distributor, tune, LIMIT);

        Tune.ForkHighWaterMark(distributor, 3);

        const reader = distributor.fork().getReader();

        await settle();
        assert.equal(reads(), 3);

        await reader.read();
        await settle();
        assert.equal(reads(), 4);

        await reader.cancel();
      });

      it('should leave already forked copies on their value', async () => {
        const distributor = makeDistributor(['a', 'b', 'c', 'd', 'e']);

        Tune.ForkHighWaterMark(distributor, 1);

        const tune = Tune.MaxStashByteLength;
        const reads = countGetterReads(distributor, tune, LIMIT);
        const reader = distributor.fork().getReader();

        await settle();
        assert.equal(reads(), 1);

        Tune.ForkHighWaterMark(distributor, 5);

        await reader.read();
        await settle();
        assert.equal(reads(), 2);

        await reader.cancel();
      });

      it('should be answered raw, without normalisation', () => {
        const distributor = makeDistributor();

        Tune.ForkHighWaterMark(distributor, '3');

        assert.equal(Get.ForkHighWaterMark(distributor), '3');
      });
    });
  });
});
