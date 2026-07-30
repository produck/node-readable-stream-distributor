import { ChunkReader } from './chunk-reader.mjs';

/**
 * Reads chunks from an in-memory `Buffer[]`.
 *
 * Each copy holds its own BufferReader with an independent index,
 * so consumption progress is isolated across copies.
 *
 * The buffer array is shared (same reference), but each reader
 * maintains its own read position.
 */
export class BufferReader extends ChunkReader {
  /**
   * @param {Buffer[]} buffer - Shared buffer array (chunks appended by distributor)
   * @param {number} [startIndex=0] - Starting chunk index
   */
  constructor(buffer, startIndex = 0) {
    super();
    /** @type {Buffer[]} Shared buffer — distributor appends chunks here */
    this._buffer = buffer;
    /** @type {number} Current read position (chunk index) */
    this._index = startIndex;
  }

  /**
   * Read the next available chunk from the buffer.
   *
   * If no new chunk is available yet (index >= buffer.length), this
   * returns `{ done: true }` — the caller (copy's pull handler) should
   * wait and retry.
   *
   * @returns {Promise<{value: Uint8Array, done: boolean}>}
   */
  async read() {
    // TODO: implement — return buffer[this._index++] if available,
    // otherwise return { done: true } to signal "not ready yet"
    throw new Error('Not implemented');
  }

  /**
   * Skip `n` chunks without returning them.
   * Overrides base to use direct index jump (O(1) vs O(n)).
   *
   * @param {number} n
   */
  async skip(_n) {
    void _n;
    // TODO: implement — this._index += n
    throw new Error('Not implemented');
  }

  /**
   * The number of chunks this reader has consumed so far.
   * @returns {number}
   */
  get consumedChunks() {
    return this._index;
  }
}
