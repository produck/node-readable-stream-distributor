import { ThrowTypeError } from '@produck/type-error';

export function NonNegativeInteger(value) {
  if (!Number.isInteger(value) || value < 0) {
    ThrowTypeError('member', 'a non-negative integer');
  }

  return value;
}
