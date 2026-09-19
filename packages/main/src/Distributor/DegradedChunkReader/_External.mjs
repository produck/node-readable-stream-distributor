import { deepFreeze } from '@produck/deep-freeze-enumerable';

import * as TRANSFERRER from './Transferrer/_Symbol.mjs';
import * as CHUNK_READER from '../ChunkReader/_Symbol.mjs';

export const _A = deepFreeze({
  READER: CHUNK_READER,
});

export { TRANSFERRER, CHUNK_READER };
