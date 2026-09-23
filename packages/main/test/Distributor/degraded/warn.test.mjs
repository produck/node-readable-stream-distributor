import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Options, SYMBOL } from '@produck/readable-stream-distributor';

import {
  makeFamily,
  makeSource,
  settle,
  TestTransferrer,
} from '#test/baseline.mjs';

const { _I: TRANSFERRER } = SYMBOL.TRANSFERRER;

it('should dispatch warn(dump-failed) when the dump fails', async () => {
  const refused = new Error('the medium refuses the dump');

  class RefusingTransferrer extends TestTransferrer {
    [TRANSFERRER.DUMP]() {
      throw refused;
    }
  }

  const family = makeFamily({ medium: RefusingTransferrer });
  const distributor = new family.Distributor(makeSource(['a']));
  const reader = distributor.fork().getReader();
  const warns = [];
  const onWarn = (event) => warns.push(event.detail);

  distributor.addEventListener('warn', onWarn);
  Options.Tune.MaxStashByteLength(distributor, 0);

  await reader.read();
  await settle();

  assert.equal(warns.length, 1);
  assert.equal(warns[0].code, 'dump-failed');
  assert.match(warns[0].payload.message, /Failed to dump the ChunkStash/);
  assert.equal(warns[0].payload.cause, refused);
});

it('should dispatch warn(backlog) once the backlog is over the limit', async () => {
  class HangingWriteTransferrer extends TestTransferrer {
    [TRANSFERRER.WRITE]() {
      return new Promise(() => {});
    }
  }

  const family = makeFamily({ medium: HangingWriteTransferrer });
  const distributor = new family.Distributor(makeSource(['a', 'bb', 'ccc']));
  const reading = distributor.fork().getReader();
  const warns = [];

  distributor.addEventListener('warn', (event) => warns.push(event.detail));

  Options.Tune.MaxStashByteLength(distributor, 0);
  Options.Tune.MaxBacklogWarningByteLength(distributor, 3);

  await reading.read();
  await reading.read();
  await reading.read();

  assert.equal(warns.length, 1);
  assert.equal(warns[0].code, 'backlog');
  assert.equal(warns[0].payload.byteLength, 5);
});
