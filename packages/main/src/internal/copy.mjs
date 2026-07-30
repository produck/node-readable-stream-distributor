/**
 * @typedef {object} Copy
 * @property {string} label
 * @property {ReadableStream} stream
 * @property {ReadableStreamDefaultController|null} _controller
 * @property {import('../chunk-reader.mjs').ChunkReader} _reader
 * @property {number} _consumedFromBuffer
 * @property {boolean} _cancelled
 * @property {boolean} _done
 */

export function createReadStream(copy, distributor) {
  if (typeof copy !== 'object' || copy === null) {
    throw new TypeError('copy must be an object');
  }

  if (typeof distributor !== 'object' || distributor === null) {
    throw new TypeError('distributor must be an object');
  }

  // TODO: implement
  // return new ReadableStream({
  //   pull: async (controller) => {
  //     const { value, done } = await copy._reader.read();
  //     if (done) { ... }
  //     controller.enqueue(value);
  //   },
  //   cancel: () => { distributor._unregister(copy); },
  // });
  throw new Error('Not implemented');
}

export function createChunkReader(distributor) {
  if (typeof distributor !== 'object' || distributor === null) {
    throw new TypeError('distributor must be an object');
  }

  // TODO: implement
  // import { $IDistributor as $ } from '../Symbol.mjs';
  // if (distributor[$.inFilePhase]) {
  //   return new FileReaderModule.FileReader(
  //     distributor[$.fileHandle], 0, distributor[$.committedChunks]);
  // }
  // return new BufferReaderModule.BufferReader(
  //   distributor[$.buffer], distributor[$.buffer].length);
  throw new Error('Not implemented');
}
