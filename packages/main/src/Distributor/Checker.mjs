// TODO: review every probe below: reading a foreign object (instanceof,
//   toString, locked, getReader) can itself throw out of the constructor.
export function isReadableStreamLike(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (value instanceof ReadableStream) {
    return true;
  }

  if (Object.prototype.toString.call(value) !== '[object ReadableStream]') {
    return false;
  }

  if (typeof value.locked !== 'boolean') {
    return false;
  }

  if (typeof value.getReader !== 'function') {
    return false;
  }

  return true;
}
