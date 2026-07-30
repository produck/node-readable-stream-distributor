import ChunkReader from './chunk-reader.mjs';
import { _IReader } from './Symbol.mjs';

const $buffer = Symbol('.$buffer');
const $index = Symbol('.$index');

export class BufferReader extends ChunkReader {
  constructor(buffer, startIndex = 0) {
    if (!Array.isArray(buffer)) {
      throw new TypeError('buffer must be an Array');
    }

    super();
    this[$buffer] = buffer;
    this[$index] = startIndex;
  }

  async [_IReader.READ]() {
    // TODO: implement — return buffer[this[$index]++] if available,
    // otherwise return { done: true } to signal "not ready yet"
    throw new Error('Not implemented');
  }

  async skip(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError('n must be a non-negative integer');
    }

    // TODO: implement — this[$index] += n
    throw new Error('Not implemented');
  }

  get consumedChunks() {
    return this[$index];
  }
}
