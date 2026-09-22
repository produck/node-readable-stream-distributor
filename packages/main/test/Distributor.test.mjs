import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Distributor, DegradedChunkReader, SYMBOL } from '../src/index.mjs';

const { DEGRADED_CHUNK_READER_CTOR } = SYMBOL.DISTRIBUTOR._S;

class TestDegradedChunkReader extends DegradedChunkReader {}

class TestDistributor extends Distributor {
  static [DEGRADED_CHUNK_READER_CTOR] = TestDegradedChunkReader;
}

const makeSource = () =>
  new ReadableStream({
    start: (controller) => controller.close(),
  });

describe('Distributor', () => {
  describe('constructor()', () => {
    it('should reject a source that is not a ReadableStream', () => {
      const badSources = [null, {}, { locked: false }];

      for (const source of badSources) {
        assert.throws(
          () => new TestDistributor(source),
          {
            name: 'TypeError',
            message: /Invalid "source", one "a WHATWG ReadableStream"/,
          },
          `source: ${JSON.stringify(source)}`,
        );
      }
    });

    it('should reject a locked source', () => {
      const source = makeSource();
      const reader = source.getReader();

      assert.throws(() => new TestDistributor(source), {
        message: /Source stream must not be locked/,
      });

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
    it('should answer a ReadableStream', () => {
      const distributor = new TestDistributor(makeSource());

      assert.ok(distributor.fork('probe') instanceof ReadableStream);
    });

    it('should reject a label that is not a string', () => {
      const distributor = new TestDistributor(makeSource());

      assert.throws(() => distributor.fork(42), {
        name: 'TypeError',
        message: /Invalid "label", one "a string" expected\./,
      });
    });

    it('should accept an omitted label', () => {
      const distributor = new TestDistributor(makeSource());

      assert.doesNotThrow(() => distributor.fork());
    });

    it('should throw once terminated', () => {
      // TODO
    });

    it('should report the missing DEGRADED_CHUNK_READER_CTOR', () => {
      class Unfinished extends Distributor {}

      assert.throws(() => new Unfinished(makeSource()).fork(), {
        message: /must be implemented in the subclass/,
      });
    });

    it('should work as well after a switch', () => {
      // TODO
    });

    describe('>stream', () => {
      it('should carry every chunk of the source once, in order', () => {
        // TODO
      });

      it('should carry on without a gap across a switch', () => {
        // TODO
      });

      it('should hold the first chunk until the medium is ready', () => {
        // TODO
      });

      it('should close once the source is done', () => {
        // TODO
      });

      it('should reject with the source error', () => {
        // TODO
      });

      it('should reject with the medium error it hit', () => {
        // TODO
      });

      it('should not lose data for a lagging copy', () => {
        // TODO
      });

      it('should not hold a fast copy behind a slow one', () => {
        // TODO
      });

      it('should stop on its own cancel, leaving other copies alone', () => {
        // TODO
      });
    });
  });

  describe('.degraded', () => {
    it('should be false while the stash holds the data', () => {
      // TODO
    });

    it('should turn true on the pull that crossed MaxStashByteLength', () => {
      // TODO
    });

    it('should turn true at the limit even when the source is done', () => {
      // TODO
    });

    it('should follow DegradeOnStashFullAndDone for a full, ended stash', () => {
      // TODO
    });

    it('should stay false, rejecting the read, when the family is unfinished', () => {
      // TODO
    });
  });

  describe('.terminated', () => {
    it('should be false by default', () => {
      // TODO
    });

    it('should turn true after terminate()', () => {
      // TODO
    });
  });

  describe('.options', () => {
    it('should answer every item of the config surface', () => {
      // TODO
    });

    it('should build a fresh snapshot on every read', () => {
      // TODO
    });

    it('should answer what Tune wrote', () => {
      // TODO
    });
  });

  describe('.setTransferrerArgs()', () => {
    it('should hand the whole argument array to PARSE_ARGUMENTS', () => {
      // TODO
    });

    it('should pass the array through when the medium kept the default', () => {
      // TODO
    });

    it('should keep the arguments for the switch', () => {
      // TODO
    });

    it('should throw once degraded', () => {
      // TODO
    });
  });

  describe('.terminate()', () => {
    it('should refuse new forks', () => {
      // TODO
    });

    it('should let running copies read the source to its end', () => {
      // TODO
    });

    it('should be idempotent', () => {
      // TODO
    });
  });

  describe('.destroy()', () => {
    it('should error every live copy at once', () => {
      // TODO
    });

    it('should be idempotent and answer one promise', () => {
      // TODO
    });

    describe('>promise', () => {
      it('should settle after the source is cancelled', () => {
        // TODO
      });

      it('should find the store sealed and released', () => {
        // TODO
      });

      it('should not wait for a reader to close', () => {
        // TODO
      });
    });
  });

  describe('#fork', () => {
    it('should dispatch once per fork', () => {
      // TODO
    });
  });

  describe('#degrade', () => {
    it('should dispatch on the pull that crossed the limit', () => {
      // TODO
    });

    it('should dispatch with degraded already true', () => {
      // TODO
    });

    it('should not dispatch again on later pulls', () => {
      // TODO
    });
  });

  describe('#terminate', () => {
    it('should dispatch once, on the first terminate()', () => {
      // TODO
    });
  });

  describe('#warn', () => {
    it('should carry dump-failed when the medium refuses the taking over', () => {
      // TODO
    });

    it('should carry source-cancel-failed when the source refuses', () => {
      // TODO
    });

    it('should carry backlog with the pending byte length', () => {
      // TODO
    });
  });
});

describe('Event', () => {
  describe('::Degrade', () => {
    it('should be a CustomEvent of type degrade', () => {
      // TODO
    });

    describe('>detail', () => {
      it('should carry the stash byte length at the switch', () => {
        // TODO
      });
    });
  });

  describe('::Fork', () => {
    it('should be a CustomEvent of type fork', () => {
      // TODO
    });

    describe('>detail', () => {
      it('should carry the forked stream', () => {
        // TODO
      });
    });
  });

  describe('::Terminate', () => {
    it('should be a CustomEvent of type terminate', () => {
      // TODO
    });
  });

  describe('::Warn', () => {
    it('should be a CustomEvent of type warn', () => {
      // TODO
    });

    describe('>detail', () => {
      it('should carry the code and its payload', () => {
        // TODO
      });
    });
  });
});

describe('SYMBOL', () => {
  it('should open _I and _S of every family, and nothing else', () => {
    // TODO
  });
});
