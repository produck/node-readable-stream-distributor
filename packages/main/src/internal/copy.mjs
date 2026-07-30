/**
 * Copy — internal class representing a registered consumer copy.
 *
 * Each copy holds an independent ChunkReader (BufferReader or
 * FileReader) and a ReadableStream controller for pushing data
 * to the consumer.
 *
 * @package
 */

import { BufferReader } from '../buffer-reader.mjs';
void BufferReader;

/**
 * @typedef {object} Copy
 * @property {string} label - Mnemonic identifier
 * @property {ReadableStream} stream - ReadableStream exposed to consumer
 * @property {ReadableStreamDefaultController|null} _controller - stream controller
 * @property {import('../chunk-reader.mjs').ChunkReader} _reader - current chunk reader
 * @property {number} _consumedFromBuffer - chunks consumed during buffer phase
 * @property {boolean} _cancelled - whether this copy has been cancelled
 * @property {boolean} _done - whether consumption is complete
 */

/**
 * Create a ReadableStream for a copy.
 *
 * pull  handler: reads the next chunk from the copy's ChunkReader.
 * cancel handler: triggers the copy's unregister flow.
 *
 * @param {Copy} copy
 * @param {import('../index.mjs').ReadableStreamDistributor} distributor
 * @returns {ReadableStream}
 */
export function createReadStream(_copy, _distributor) {
  void _copy;
  void _distributor;
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

/**
 * Create the appropriate ChunkReader for a newly registered copy.
 *
 * - Buffer phase: BufferReader, starting at current buffer length
 *   (skips already-buffered chunks)
 * - File phase: FileReader, skipping already-consumed chunks
 *
 * @param {import('../index.mjs').ReadableStreamDistributor} distributor
 * @returns {import('../chunk-reader.mjs').ChunkReader}
 */
export function createChunkReader(_distributor) {
  void _distributor;
  // TODO: implement
  // if (distributor._inFilePhase) {
  //   return new FileReader(distributor._fileHandle, 0, distributor._committedChunks);
  // }
  // return new BufferReader(distributor._buffer, distributor._buffer.length);
  throw new Error('Not implemented');
}
