import * as os from 'node:os';

import { $ } from './symbol.mjs';

export class ReadableStreamDistributor {
  /** @param {ReadableStream} source — must be unlocked */
  constructor(source) {
    if (source.locked) {
      throw new Error('Source stream must not be locked');
    }

    this[$.source] = source;
    this[$.reader] = null;
    this[$.buffer] = [];
    this[$.bufferSize] = 0;
    this[$.copies] = new Set();
    this[$.fileHandle] = null;
    this[$.tmpfilePath] = null;
    this[$.committedChunks] = 0;
    this[$.inFilePhase] = false;
    this[$.destroyed] = false;
    this[$.pulling] = null;
    this[$.sourceDone] = false;
    this[$.sourceError] = null;
    this[$.totalChunks] = 0;
  }

  get highWaterMark() {
    return os.freemem();
  }

  get tmpdir() {
    return process.env.TMPDIR || os.tmpdir();
  }

  register(options) {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('options must be an object');
    }

    if (typeof options.label !== 'string') {
      throw new TypeError('options.label must be a string');
    }

    if (this[$.destroyed]) {
      throw new Error('Distributor has been destroyed');
    }

    // TODO: implement
    // 1. Create Copy object via Copy.create(this) — yields BufferReader
    //    or FileReaderModule.FileReader depending on phase
    // 2. Create ReadableStream via Copy.createReadStream(copy, this)
    // 3. Add copy to this[$.copies]
    // 4. Acquire source reader and start pull loop if not already started
    // 5. Return { stream, unregister }
    throw new Error('Not implemented');
  }

  destroy() {
    // TODO: implement
    // 1. this[$.destroyed] = true
    // 2. Cancel reader if present (stop pulling from source)
    // 3. After copies drain buffered data, enqueue distinguishable error
    // 4. Clean up file resources
    throw new Error('Not implemented');
  }
}
