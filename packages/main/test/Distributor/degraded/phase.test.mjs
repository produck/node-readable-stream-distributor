import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Options } from '@produck/readable-stream-distributor';

import { makeSource, TestDistributor } from '#test/baseline.mjs';

it('should be false while the stash holds the data', () => {
  // TODO
});

it('should turn true on the pull that crossed MaxStashByteLength', () => {
  // TODO
});

it('should turn true at the limit even when the source is done', async () => {
  const distributor = new TestDistributor(makeSource(['a']));
  const reader = distributor.fork().getReader();

  Options.Tune.DegradeOnStashFullAndDone(distributor, true);
  Options.Tune.MaxStashByteLength(distributor, 1);

  await reader.read();
  assert.equal(distributor.degraded, false);

  Options.Tune.MaxStashByteLength(distributor, 0);

  await reader.read();
  assert.equal(distributor.degraded, true);
});

it('should follow DegradeOnStashFullAndDone for a full, ended stash', () => {
  // TODO
});

it('should stay false, rejecting the read, when the family is unfinished', () => {
  // TODO
});
