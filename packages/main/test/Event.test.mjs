import { describe, it } from 'node:test';

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
