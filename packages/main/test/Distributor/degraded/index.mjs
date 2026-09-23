import { describe } from 'node:test';

describe('.degraded', async () => {
  await import('./phase.test.mjs');
  await import('./event.test.mjs');
  await import('./warn.test.mjs');
});
