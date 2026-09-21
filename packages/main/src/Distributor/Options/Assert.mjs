import { ThrowTypeError } from '@produck/type-error';

export function NonNegativeInteger(value) {
  if (!Number.isInteger(value) || value < 0) {
    ThrowTypeError('member', 'non-negative integer');
  }

  return value;
}

export function Boolean(value) {
  if (typeof value !== 'boolean') {
    ThrowTypeError('member', 'boolean');
  }

  return value;
}
