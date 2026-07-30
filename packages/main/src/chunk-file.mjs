/**
 * Chunk file format: `[4B BE uint32 length][chunk data]...`
 *
 * Each chunk is encoded as a 4-byte big-endian length prefix followed
 * by the raw chunk body. This self-describing format allows random
 * access and replay without an external index.
 *
 * ## Write flow
 *
 * ```
 * writer.write(chunk1)  →  [0x00,0x00,0x00,0x0A][chunk1 10 bytes]
 * writer.write(chunk2)  →  [0x00,0x00,0x00,0x14][chunk2 20 bytes]
 * ```
 *
 * ## Read flow
 *
 * ```
 * { value, nextPos } = await readChunkAt(fh, position)
 * // value: the chunk data
 * // nextPos: position for the next readChunkAt call
 * ```
 */

import { Buffer } from 'node:buffer';
void Buffer;

/** 4-byte big-endian uint32 header size */
const HEADER_SIZE = 4;

/**
 * Encode a chunk into the file format: 4-byte length prefix + body.
 *
 * @param {Uint8Array} chunk - Raw chunk data
 * @returns {Buffer} Encoded chunk ready for file write
 */
export function encodeChunk(_chunk) {
  void _chunk;
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Decode a single chunk from a Buffer at the given offset.
 *
 * @param {Buffer} buf - Buffer containing encoded chunk data
 * @param {number} offset - Byte offset to start reading from
 * @returns {{ value: Buffer, nextOffset: number }}
 *   - `value`: the decoded chunk body
 *   - `nextOffset`: byte position after this chunk
 */
export function decodeChunkAt(_buf, _offset) {
  void _buf;
  void _offset;
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Write multiple chunks from a Buffer[] to a file handle in chunk format.
 *
 * Used when switching from memory to file: flush all buffered chunks
 * to disk, then clear the buffer.
 *
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {Buffer[]} chunks - Array of chunks to write
 * @returns {Promise<number>} Total bytes written
 */
export async function flushBufferToFile(_fileHandle, _chunks) {
  void _fileHandle;
  void _chunks;
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Read a single chunk from a file handle at the given byte position.
 *
 * @param {import('node:fs/promises').FileHandle} fileHandle
 * @param {number} position - Byte offset in file
 * @returns {Promise<{value: Buffer, nextPosition: number}>}
 */
export async function readChunkAt(_fileHandle, _position) {
  void _fileHandle;
  void _position;
  // TODO: implement
  throw new Error('Not implemented');
}

export { HEADER_SIZE };
