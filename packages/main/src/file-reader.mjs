import { ChunkReader } from './chunk-reader.mjs';
import { readChunkAt } from './chunk-file.mjs';
void readChunkAt;

/**
 * Reads chunks from a chunk-format file on disk.
 *
 * Each copy gets its own FileReader with an independent file cursor
 * (byte position). The reader advances through the file by reading
 * one `[4B len][body]` record at a time.
 *
 * When a copy switches from BufferReader to FileReader, chunks already
 * consumed from memory are skipped by advancing the cursor past those
 * records in the file.
 */
export class FileReader extends ChunkReader {
  /**
   * @param {import('node:fs/promises').FileHandle} fileHandle - Open file handle
   * @param {number} skipChunks - Number of chunks to skip (already consumed from buffer)
   * @param {number} committedChunks - Shared counter: total chunks committed to file
   */
  constructor(fileHandle, skipChunks, committedChunks) {
    super();
    /** @type {import('node:fs/promises').FileHandle} */
    this._fileHandle = fileHandle;
    /** @type {number} Current byte position in file */
    this._position = 0;
    /** @type {number} Shared counter — total chunks written to file so far */
    this._committedChunks = committedChunks;
    /** @type {number} How many chunks this reader has consumed from file */
    this._chunksRead = 0;
  }

  /**
   * Read the next chunk from the file.
   *
   * If the file cursor is at or beyond committed chunks, returns
   * `{ done: true }` — caller should wait and retry.
   *
   * @returns {Promise<{value: Uint8Array, done: boolean}>}
   */
  async read() {
    // TODO: implement
    // 1. Check if this._chunksRead >= this._committedChunks → { done: true }
    // 2. { value, nextPosition } = await readChunkAt(this._fileHandle, this._position)
    // 3. this._position = nextPosition; this._chunksRead++
    // 4. return { value, done: false }
    throw new Error('Not implemented');
  }

  /**
   * Skip `n` chunks forward in the file.
   * Reads and discards headers + bodies to advance the cursor.
   *
   * @param {number} n
   */
  async skip(_n) {
    void _n;
    // TODO: implement — read and discard n chunks to advance position
    throw new Error('Not implemented');
  }

  /**
   * The number of chunks this reader has consumed from the file.
   * @returns {number}
   */
  get consumedChunks() {
    return this._chunksRead;
  }
}
