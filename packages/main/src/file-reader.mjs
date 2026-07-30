import ChunkReader from './chunk-reader.mjs';
import { IReader } from './Symbol.mjs';

const $fileHandle = Symbol('.$fileHandle');
const $position = Symbol('.$position');
const $committedChunks = Symbol('.$committedChunks');
const $chunksRead = Symbol('.$chunksRead');

export class FileReader extends ChunkReader {
  constructor(fileHandle, skipChunks, committedChunks) {
    if (!Number.isInteger(skipChunks) || skipChunks < 0) {
      throw new TypeError('skipChunks must be a non-negative integer');
    }

    if (!Number.isInteger(committedChunks) || committedChunks < 0) {
      throw new TypeError('committedChunks must be a non-negative integer');
    }

    super();
    this[$fileHandle] = fileHandle;
    this[$position] = 0;
    this[$committedChunks] = committedChunks;
    this[$chunksRead] = 0;
  }

  async [IReader.READ]() {
    if (this[$chunksRead] >= this[$committedChunks]) {
      return { done: true };
    }

    // TODO: implement — readChunkAt(this[$fileHandle], this[$position]),
    // advance this[$position] and this[$chunksRead]
    throw new Error('Not implemented');
  }

  async skip(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError('n must be a non-negative integer');
    }

    // TODO: implement — read and discard n chunks to advance position
    throw new Error('Not implemented');
  }

  get consumedChunks() {
    return this[$chunksRead];
  }
}
