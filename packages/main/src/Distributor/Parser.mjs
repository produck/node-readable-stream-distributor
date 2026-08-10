import { ThrowTypeError } from '@produck/type-error';

export function NonNegativeInteger(value) {
  if (!Number.isInteger(value) || value < 0) {
    ThrowTypeError('member', 'a non-negative integer');
  }

  return value;
}

export function AbsolutePath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    ThrowTypeError('member', 'an absolute path string');
  }

  const isPosix = value.startsWith('/');
  const isWindows = /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\');

  if (!isPosix && !isWindows) {
    ThrowTypeError('member', 'an absolute path string');
  }

  return value;
}
