import { describe, it } from 'node:test';

describe('Transferrer', () => {
  describe('constructor()', () => {
    it('should receive the parsed argument list', () => {
      // TODO
    });

    describe('>instance', () => {
      it('should start with nothing pending', () => {
        // TODO
      });

      it('should start not done, not dropped and without error', () => {
        // TODO
      });
    });
  });

  describe('.pendingByteLength', () => {
    it('should count only what came in after the hand-over', () => {
      // TODO
    });

    it('should fall back as the drain writes', () => {
      // TODO
    });

    it('should answer zero once the store is released', () => {
      // TODO
    });
  });

  describe('.dumping', () => {
    it('should be null before the stash is taken over', () => {
      // TODO
    });

    it('should be the promise of the taking over, while it runs', () => {
      // TODO
    });
  });

  describe('.done', () => {
    it('should turn true when the source had ended at the switch', () => {
      // TODO
    });

    it('should turn true when the distributor is destroyed', () => {
      // TODO
    });
  });

  describe('.error', () => {
    it('should keep the first failure', () => {
      // TODO
    });

    it('should be the cause of the rejected read', () => {
      // TODO
    });
  });

  describe('.dropped', () => {
    it('should turn true when the distributor releases the store', () => {
      // TODO
    });

    it('should not wait for the medium to release its own resources', () => {
      // TODO
    });
  });
});
