import { deepFreeze } from '@produck/deep-freeze-enumerable';

import * as TRANSFERRER from './Transferrer/_Symbol.mjs';
import * as CHUNK_READER from '../ChunkReader/_Symbol.mjs';
import * as DISTRIBUTOR from '../_Symbol.mjs';

export const _A = deepFreeze({
  READER: CHUNK_READER,
  DISTRIBUTOR,
});

export { TRANSFERRER, CHUNK_READER, DISTRIBUTOR };
