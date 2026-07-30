import { Buffer } from 'node:buffer';

export const HEADER_SIZE = 4;

export function encodeChunk(chunk) {
  if (!(chunk instanceof Uint8Array)) {
    throw new TypeError('chunk must be a Uint8Array');
  }

  // TODO: implement — 4-byte BE length prefix + body
  throw new Error('Not implemented');
}

export function decodeChunkAt(buf, offset) {
  if (!Buffer.isBuffer(buf)) {
    throw new TypeError('buf must be a Buffer');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new TypeError('offset must be a non-negative integer');
  }

  // TODO: implement — read 4B length, then body
  throw new Error('Not implemented');
}

export async function flushBufferToFile(fileHandle, chunks) {
  if (!Array.isArray(chunks)) {
    throw new TypeError('chunks must be an Array');
  }

  // TODO: implement — write all chunks in [4B len][body] format
  throw new Error('Not implemented');
}

export async function readChunkAt(fileHandle, position) {
  if (!Number.isInteger(position) || position < 0) {
    throw new TypeError('position must be a non-negative integer');
  }

  // TODO: implement — read one chunk record at file position
  throw new Error('Not implemented');
}
