import { describe, it } from 'node:test';

describe('ForkedReadableStream', () => {
  it('should be a ReadableStream', () => {
    // TODO
  });

  describe('.getReader()', () => {
    describe('>reader', () => {
      it('should yield every chunk of the source once, in order', () => {
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
    });
  });

  describe('.cancel()', () => {
    it('should stop the copy it was called on', () => {
      // TODO
    });

    it('should be idempotent', () => {
      // TODO
    });

    it('should leave every other copy reading to its end', () => {
      // TODO
    });
  });
});
