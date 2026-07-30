import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReadableStreamDistributor } from '../src/index.mjs';

describe('ReadableStreamDistributor', () => {
  describe('constructor', () => {
    it('should reject a locked source', () => {
      const source = new ReadableStream({
        start(controller) { controller.close(); },
      });

      const reader = source.getReader();

      assert.throws(
        () => new ReadableStreamDistributor(source),
        /must not be locked/,
      );

      reader.releaseLock();
    });

    it('should accept an unlocked source', () => {
      const source = new ReadableStream({
        start(controller) { controller.close(); },
      });

      assert.doesNotThrow(() => new ReadableStreamDistributor(source));
    });
  });

  describe('::highWaterMark', () => {
    it('should return a positive number by default', () => {
      // TODO
    });

    it('should be overridable by subclass', () => {
      // TODO
    });
  });

  describe('::tmpdir', () => {
    it('should return a string by default', () => {
      // TODO
    });

    it('should respect TMPDIR env var', () => {
      // TODO
    });
  });

  describe('.register()', () => {
    it('should return a stream and unregister function', () => {
      // TODO
    });

    it('should throw when called on a destroyed distributor', () => {
      // TODO
    });

    it('should allow multiple registrations', () => {
      // TODO
    });

    describe('>stream', () => {
      it('should be a ReadableStream', () => {
        // TODO
      });

      it('should receive all chunks from source', () => {
        // TODO
      });

      it('should allow independent consumption pace', () => {
        // TODO: fast consumers are not blocked by slow ones
      });

      it('should not lose data when slow consumer lags behind', () => {
        // TODO: slow consumers never lose data
      });
    });

    describe('>unregister', () => {
      it('should remove the copy from active set', () => {
        // TODO
      });

      it('should not affect other copies', () => {
        // TODO: unregistering one copy does not affect others
      });

      it('should cancel source reader when all copies leave', () => {
        // TODO: all copies gone → release source reader
      });
    });
  });

  describe('.destroy()', () => {
    it('should stop pulling from source', () => {
      // TODO
    });

    it('should let consumers drain buffered data', () => {
      // TODO: consumers first drain buffered data
    });

    it('should error copies after buffered data is exhausted', () => {
      // TODO: stream errors after buffered data is exhausted
    });
  });

  describe('memory → file phase transition', () => {
    it('should switch to file when buffer exceeds highWaterMark', () => {
      // TODO
    });

    it('should maintain chunk boundaries after switch', () => {
      // TODO: chunk boundaries remain consistent after switch
    });

    it('should allow fast consumers to skip already-consumed chunks', () => {
      // TODO: fast consumers skip already-consumed chunks
    });

    it('should replay missed chunks for slow consumers', () => {
      // TODO: slow consumers catch up from file
    });
  });

  describe('edge cases', () => {
    it('should handle empty source stream', () => {
      // TODO
    });

    it('should propagate source error to all copies', () => {
      // TODO
    });

    it('should handle cancel of a single copy stream', () => {
      // TODO: cancelling one copy does not affect others
    });

    it('should clean up file resources after all copies done', () => {
      // TODO: clean up temp file after all copies complete
    });
  });
});
