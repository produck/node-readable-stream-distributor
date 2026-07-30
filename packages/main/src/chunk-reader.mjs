/**
 * ChunkReader — abstract interface for reading chunks from storage.
 *
 * Each registered copy holds an independent ChunkReader. When the
 * distributor switches from memory to file, the reader is replaced
 * transparently without the consumer noticing.
 *
 * @interface
 */
export class ChunkReader {
  /**
   * Read the next chunk.
   *
   * @returns {Promise<{value: Uint8Array, done: boolean}>}
   *   - `value`: the chunk data (undefined when done)
   *   - `done`: true when no more chunks are available yet or stream ended
   */
  async read() {
    throw new Error('Not implemented');
  }

  /**
   * Skip forward by `n` chunks without returning them.
   * Used when switching from BufferReader to FileReader — copies
   * that already consumed chunks from memory skip those chunks in
   * the file.
   *
   * @param {number} n - Number of chunks to skip
   * @returns {Promise<void>}
   */
  async skip(n) {
    for (let i = 0; i < n; i++) {
      await this.read();
    }
  }
}
