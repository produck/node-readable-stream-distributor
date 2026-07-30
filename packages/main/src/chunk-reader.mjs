export class ChunkReader {
  async read() {
    throw new Error('Not implemented');
  }

  async skip(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError('n must be a non-negative integer');
    }

    for (let i = 0; i < n; i++) {
      await this.read();
    }
  }
}
