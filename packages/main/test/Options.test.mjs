import { describe, it } from 'node:test';

describe('Options', () => {
  describe('::Tune', () => {
    it('should store a plain value as a constant', () => {
      // TODO
    });

    it('should store a function as the getter itself', () => {
      // TODO
    });

    it('should refuse a value the item assert rejects', () => {
      // TODO
    });

    it('should change only the instance it was given', () => {
      // TODO
    });

    describe('::MaxStashByteLength()', () => {
      it('should refuse a negative value', () => {
        // TODO
      });

      it('should refuse a fractional value', () => {
        // TODO
      });
    });

    describe('::MaxBacklogWarningByteLength()', () => {
      it('should refuse a negative value', () => {
        // TODO
      });
    });

    describe('::DegradeOnStashFullAndDone()', () => {
      it('should refuse a value that is not a boolean', () => {
        // TODO
      });
    });

    describe('::ForkHighWaterMark()', () => {
      it('should refuse a negative value', () => {
        // TODO
      });

      it('should refuse NaN', () => {
        // TODO
      });

      it('should refuse a BigInt and a Symbol', () => {
        // TODO
      });

      it('should pass a numeric string and a boolean through', () => {
        // TODO
      });
    });
  });

  describe('::Get', () => {
    describe('::MaxStashByteLength()', () => {
      it('should default to 1 GiB', () => {
        // TODO
      });

      it('should be read on every pull', () => {
        // TODO
      });

      it('should stop being read once the phase has flipped', () => {
        // TODO
      });
    });

    describe('::MaxBacklogWarningByteLength()', () => {
      it('should default to what MaxStashByteLength answers', () => {
        // TODO
      });

      it('should follow MaxStashByteLength when it moves', () => {
        // TODO
      });

      it('should be read after every write to the medium', () => {
        // TODO
      });
    });

    describe('::DegradeOnStashFullAndDone()', () => {
      it('should default to false', () => {
        // TODO
      });

      it('should be read on the pull that crossed the limit', () => {
        // TODO
      });
    });

    describe('::ForkHighWaterMark()', () => {
      it('should default to 1', () => {
        // TODO
      });

      it('should be read once per fork, at construction', () => {
        // TODO
      });

      it('should be the queue depth of a fork', () => {
        // TODO
      });

      it('should leave already forked copies on their value', () => {
        // TODO
      });

      it('should be answered raw, without normalisation', () => {
        // TODO
      });
    });
  });
});
