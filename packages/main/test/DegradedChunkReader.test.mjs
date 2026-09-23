import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DegradedChunkReader,
  Options,
} from '@produck/readable-stream-distributor';

import {
  makeSource,
  TestDegradedChunkReader,
  TestDistributor,
  TestTransferrer,
} from '#test/baseline.mjs';

import { A, $I } from '../src/Distributor/_Symbol.mjs';
import { A as FORKED } from '../src/Distributor/ForkedReadableStream/_Symbol.mjs';

describe('DegradedChunkReader', () => {
  describe('constructor()', () => {
    it('should take the agent, the stash and the transferrer', () => {
      const distributor = new TestDistributor(makeSource());
      const reader = new TestDegradedChunkReader(
        distributor[A.I.AGENT],
        distributor[A.I.STASH],
        new TestTransferrer(),
      );

      assert.ok(reader instanceof DegradedChunkReader);
    });

    describe('>instance', () => {
      it('should answer the stash it was given', () => {
        const distributor = new TestDistributor(makeSource());
        const stash = distributor[A.I.STASH];
        const reader = new TestDegradedChunkReader(
          distributor[A.I.AGENT],
          stash,
          new TestTransferrer(),
        );

        assert.equal(reader.chunkStash, stash);
      });

      it('should answer the transferrer it was given', () => {
        const distributor = new TestDistributor(makeSource());
        const medium = new TestTransferrer();
        const reader = new TestDegradedChunkReader(
          distributor[A.I.AGENT],
          distributor[A.I.STASH],
          medium,
        );

        assert.equal(reader.transferrer, medium);
      });

      it('should start open', () => {
        const distributor = new TestDistributor(makeSource());
        const reader = new TestDegradedChunkReader(
          distributor[A.I.AGENT],
          distributor[A.I.STASH],
          new TestTransferrer(),
        );

        assert.equal(reader.closed, false);
      });
    });
  });

  describe('.chunkStash', () => {
    it('should answer the stash of the phase', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      const reader = forked[FORKED.I.READER];

      assert.equal(reader.chunkStash, distributor[A.I.STASH]);
    });
  });

  describe('.transferrer', () => {
    it('should answer the medium of the phase', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const forked = distributor.fork();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await forked.getReader().read();

      const reader = forked[FORKED.I.READER];

      assert.equal(reader.transferrer, distributor[$I.TRANSFERRER]);
    });
  });

  describe('.closed', () => {
    it('should be false while the copy is still readable', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const forked = distributor.fork();
      const reading = forked.getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();

      const reader = forked[FORKED.I.READER];

      assert.equal(reader.closed, false);

      const end = await reading.read();

      assert.equal(end.done, true);
    });

    it('should turn true when the distributor is destroyed', async () => {
      const distributor = new TestDistributor(makeSource(['a']));
      const forked = distributor.fork();
      const reading = forked.getReader();

      Options.Tune.MaxStashByteLength(distributor, 0);

      await reading.read();

      const reader = forked[FORKED.I.READER];

      assert.equal(reader.closed, false);

      await distributor.destroy();

      assert.equal(reader.closed, true);
    });
  });
});
