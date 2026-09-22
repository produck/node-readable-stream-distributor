import { describe, it } from 'node:test';

describe('DegradedChunkReader', () => {
  describe('constructor()', () => {
    it('should take the agent, the stash and the transferrer', () => {
      // TODO
    });

    describe('>instance', () => {
      it('should answer the stash it was given', () => {
        // TODO
      });

      it('should answer the transferrer it was given', () => {
        // TODO
      });

      it('should start open', () => {
        // TODO
      });
    });
  });

  describe('.chunkStash', () => {
    it('should answer the stash of the phase', () => {
      // TODO
    });
  });

  describe('.transferrer', () => {
    it('should answer the medium of the phase', () => {
      // TODO
    });
  });

  describe('.closed', () => {
    it('should be false while the copy is still readable', () => {
      // TODO
    });

    it('should turn true when the distributor is destroyed', () => {
      // TODO
    });
  });
});
