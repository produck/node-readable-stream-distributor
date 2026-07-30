/**
 * ReadableStreamDistributor — distributes a single ReadableStream to
 * multiple independent consumers.
 *
 * `ReadableStream` is a single-consumer model — a chunk read by one
 * consumer disappears from the stream. The distributor breaks this
 * limitation: one source stream is fanned out to multiple consumers,
 * each receiving a complete, independent copy. Consumption progress
 * is fully isolated — fast readers don't wait for slow ones, and slow
 * readers never lose data.
 *
 * Supports automatic memory-to-disk overflow while preserving chunk
 * boundaries.
 *
 * @example
 * ```js
 * import { ReadableStreamDistributor } from '@produck/readable-stream-distributor';
 *
 * const distributor = new ReadableStreamDistributor(source);
 * const copy = distributor.register({ label: 'sha1-checker' });
 *
 * const reader = copy.stream.getReader();
 * while (true) {
 *   const { value, done } = await reader.read();
 *   if (done) break;
 * }
 * ```
 */
import { createReadStream } from './internal/copy.mjs';
import { BufferReader } from './buffer-reader.mjs';
import { flushBufferToFile } from './chunk-file.mjs';
import { FileReader } from './file-reader.mjs';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

void createReadStream;
void BufferReader;
void flushBufferToFile;
void FileReader;
void fs;
void path;
void randomUUID;

export class ReadableStreamDistributor {
  /**
   * @param {ReadableStream} source - Source stream; must be unlocked
   *   (source.locked === false)
   * @throws {Error} If source is already locked
   */
  constructor(source) {
    if (source.locked) {
      throw new Error('Source stream must not be locked');
    }

    /** @type {ReadableStream} Source stream */
    this._source = source;

    /** @type {ReadableStreamDefaultReader|null} Source stream reader */
    this._reader = null;

    /** @type {Buffer[]} In-memory chunk buffer */
    this._buffer = [];

    /** @type {number} Total bytes in buffer */
    this._bufferSize = 0;

    /** @type {Set<import('./internal/copy.mjs').Copy>} Active copy set */
    this._copies = new Set();

    /** @type {import('node:fs/promises').FileHandle|null} Overflow file handle */
    this._fileHandle = null;

    /** @type {string|null} Overflow file path */
    this._tmpfilePath = null;

    /** @type {number} Total chunks committed to file (shared counter) */
    this._committedChunks = 0;

    /** @type {boolean} Whether currently in file phase */
    this._inFilePhase = false;

    /** @type {boolean} Whether distributor has been destroyed */
    this._destroyed = false;

    /** @type {Promise<void>|null} In-flight pull operation */
    this._pulling = null;

    /** @type {boolean} Whether source stream is exhausted */
    this._sourceDone = false;

    /** @type {Error|null} Source stream error (if any) */
    this._sourceError = null;

    /** @type {number} Total chunks read from source */
    this._totalChunks = 0;
  }

  // ── Overridable properties ──────────────────────────────

  /**
   * Memory high-water mark in bytes. When total buffered data exceeds
   * this threshold, chunks spill to disk.
   *
   * Default returns `os.freemem()`. Subclasses may override to set
   * a custom threshold.
   *
   * Note: once overflow to disk has occurred, this property is no
   * longer consulted (one-way door).
   *
   * @returns {number}
   */
  get highWaterMark() {
    return os.freemem();
  }

  /**
   * Temporary directory for overflow chunk files.
   *
   * Default reads the `TMPDIR` environment variable at call time,
   * falling back to `os.tmpdir()`. Runtime evaluation allows ops to
   * adjust the path without restarting the process.
   *
   * @returns {string}
   */
  get tmpdir() {
    return process.env.TMPDIR || os.tmpdir();
  }

  // ── Public API ──────────────────────────────────────────

  /**
   * Register a new consumer copy.
   *
   * @param {{ label: string }} options
   *   - `label`: Mnemonic identifier for events and statistics;
   *     uniqueness is not enforced
   * @returns {{ stream: ReadableStream, unregister: () => void }}
   *   - `stream`: Independent ReadableStream copy
   *   - `unregister()`: Proactive early termination (not needed when
   *     consumption completes normally)
   */
  register({ label: _label }) {
    void _label;
    if (this._destroyed) {
      throw new Error('Distributor has been destroyed');
    }

    // TODO: implement
    // 1. Create internal Copy object (with BufferReader, or FileReader
    //    if already in file phase)
    // 2. Create ReadableStream (pull-based controller)
    // 3. Add copy to this._copies
    // 4. If not yet started, acquire source reader and begin pull loop
    // 5. Return { stream, unregister: () => this._unregister(copy) }
    throw new Error('Not implemented');
  }

  /**
   * Force-destroy the distributor.
   *
   * Follows the same pattern as error propagation — deferred exposure,
   * no surprise termination of copies:
   * 1. Distributor marked as destroyed → stops pulling from source
   * 2. Each copy drains buffered data normally
   * 3. After exhaustion, stream errors with a distinguishable error
   *    type (downstream can differentiate unexpected termination from
   *    policy-enforced truncation)
   * 4. Close files → release source reader → distributor is unusable
   */
  destroy() {
    // TODO: implement
    // 1. this._destroyed = true
    // 2. If _reader exists, cancel it (stop pulling from source)
    // 3. After copies drain buffered data, enqueue error
    // 4. Clean up file resources
    throw new Error('Not implemented');
  }

  // ── Internal methods ────────────────────────────────────

  /**
   * Start the source pull loop.
   *
   * Called on first register(). Continuously pulls chunks from the
   * source reader, stores them in the buffer, and broadcasts to all
   * active copies.
   *
   * @returns {Promise<void>}
   */
  async _startPullLoop() {
    // TODO: implement
    // 1. this._reader = this._source.getReader()
    // 2. loop: { value, done } = await this._reader.read()
    // 3. if done: this._sourceDone = true, broadcast done, break
    // 4. this._buffer.push(value), this._bufferSize += value.byteLength
    // 5. Broadcast chunk to all copies
    // 6. Check highWaterMark → maybe switch to file
    // 7. If no copies left, cancel reader and break
    throw new Error('Not implemented');
  }

  /**
   * Broadcast a chunk to all active copies.
   *
   * @param {Buffer} chunk
   */
  _broadcast(_chunk) {
    void _chunk;
    // TODO: implement
    // Iterate this._copies, enqueue chunk to each copy's stream controller
    throw new Error('Not implemented');
  }

  /**
   * Broadcast source-end signal to all active copies.
   */
  _broadcastDone() {
    // TODO: implement
    // Iterate this._copies, close each copy's stream controller
    throw new Error('Not implemented');
  }

  /**
   * Broadcast an error to all active copies.
   *
   * @param {Error} error
   */
  _broadcastError(_error) {
    void _error;
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Memory → file phase transition.
   *
   * One-way door: once switched, never goes back. Flow:
   * 1. Create overflow file
   * 2. Write Buffer[] contents to file in chunk format
   * 3. Clear Buffer[]
   * 4. Replace each copy's reader: BufferReader → FileReader
   *    (skip already-consumed chunks)
   * 5. Subsequent chunks go directly to file
   */
  async _switchToFile() {
    // TODO: implement
    // 1. Create temp file: path.join(this.tmpdir, randomUUID())
    // 2. this._fileHandle = await fs.open(tmpfile, 'w')
    // 3. await flushBufferToFile(this._fileHandle, this._buffer)
    // 4. this._committedChunks = this._buffer.length
    // 5. Iterate copies, replace reader
    //    - Consumed N chunks → new FileReader(fh, skipChunks=N, committedChunks)
    // 6. this._buffer = [], this._bufferSize = 0
    // 7. this._inFilePhase = true
    throw new Error('Not implemented');
  }

  /**
   * Unregister a copy (internal).
   *
   * Triggered when the consumer cancels its stream, finishes consuming
   * (done), or actively calls unregister().
   *
   * When all copies have left, cancels the source reader.
   *
   * @param {import('./internal/copy.mjs').Copy} copy
   */
  _unregister(_copy) {
    void _copy;
    // TODO: implement
    // 1. Remove from this._copies
    // 2. If this._copies is empty → reader.cancel() / releaseLock()
    // 3. Clean up copy-related resources
    throw new Error('Not implemented');
  }

  /**
   * Clean up file resources (overflow file and file handle).
   */
  async _cleanupFile() {
    // TODO: implement
    // Close fileHandle, delete tmpfile
    throw new Error('Not implemented');
  }
}
