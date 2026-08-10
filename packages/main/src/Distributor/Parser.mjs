import * as path from 'node:path';

import { ThrowTypeError } from '@produck/type-error';

export function NonNegativeInteger(value) {
  if (!Number.isInteger(value) || value < 0) {
    ThrowTypeError('member', 'a non-negative integer');
  }

  return value;
}

export function AbsolutePath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) {
    ThrowTypeError('member', 'an absolute path string');
  }

  return value;
}
