import * as os from 'node:os';

import { $IDistributor as $ } from './Symbol.mjs';

export class ReadableStreamDistributor {
  /** @param {ReadableStream} source — must be unlocked */
  constructor(source) {
    if (source.locked) {
      throw new Error('Source stream must not be locked');
    }

    this[$.SOURCE] = source;
    this[$.READER] = null;
    this[$.BUFFER] = [];
    this[$.BUFFER_SIZE] = 0;
    this[$.COPIES] = new Set();
    this[$.FILE_HANDLE] = null;
    this[$.TMPFILE_PATH] = null;
    this[$.COMMITTED_CHUNKS] = 0;
    this[$.IN_FILE_PHASE] = false;
    this[$.DESTROYED] = false;
    this[$.PULLING] = null;
    this[$.SOURCE_DONE] = false;
    this[$.SOURCE_ERROR] = null;
    this[$.TOTAL_CHUNKS] = 0;
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

    if (this[$.DESTROYED]) {
      throw new Error('Distributor has been destroyed');
    }

    // TODO: implement
    // 1. Create Copy object via Copy.create(this) — yields BufferReader
    //    or FileReader depending on phase
    // 2. Create ReadableStream via Copy.createReadStream(copy, this)
    // 3. Add copy to this[$.COPIES]
    // 4. Acquire source reader and start pull loop if not already started
    // 5. Return { stream, unregister }
    throw new Error('Not implemented');
  }

  destroy() {
    // TODO: implement
    // 1. this[$.DESTROYED] = true
    // 2. Cancel reader if present (stop pulling from source)
    // 3. After copies drain buffered data, enqueue distinguishable error
    // 4. Clean up file resources
    throw new Error('Not implemented');
  }
}
