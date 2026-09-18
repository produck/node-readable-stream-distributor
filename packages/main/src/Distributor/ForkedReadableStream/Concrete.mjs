import * as ChunkReader from '../ChunkReader/index.mjs';
import { I, $I, DISTRIBUTOR } from './Symbol.mjs';

export default class ForkedReadableStream extends ReadableStream {
  [I.LABEL];
  [I.DISTRIBUTOR];
  // TODO: written in the constructor but never read yet — reserved for
  //   out-of-band control (e.g. a distributor destroy erroring live forks).
  [I.CONTROLLER];
  [I.CHUNK_READER];
  [$I.CANCELLED] = false;
  [I.DONE] = false;

  constructor(distributor, bufferChunkReader, label) {
    let _controller;
    const registry =
      distributor[DISTRIBUTOR.$I.FORKED_READABLE_STREAM_REGISTRY];

    super({
      start: (controller) => {
        _controller = controller;
      },
      pull: async (controller) => {
        if (this[$I.CANCELLED] || this[I.DONE]) {
          return;
        }

        // The consumer side does exactly one thing: read its own ChunkReader.
        // Driving the source, waiting when short and rejecting on source error
        // all belong to the reader's read path (see ChunkReader/Abstract.mjs);
        // a rejection here surfaces as the stream's error automatically.
        const reader = this[$I.CHUNK_READER];
        const result = await reader[ChunkReader.$I.ENSURE_THEN_READ]();

        if (result.done) {
          this[I.DONE] = true;
          controller.close();
          registry.prune(this);

          return;
        }

        controller.enqueue(result.value);
      },
      cancel: () => {
        if (this[$I.CANCELLED]) {
          return;
        }

        this[$I.CANCELLED] = true;
        registry.prune(this);
      },
    });

    this[I.LABEL] = label;
    this[I.DISTRIBUTOR] = distributor;
    this[I.CHUNK_READER] = bufferChunkReader;
    this[I.CONTROLLER] = _controller;
  }

  get distributor() {
    return this[I.DISTRIBUTOR];
  }

  get [$I.CHUNK_READER]() {
    return this[I.CHUNK_READER];
  }

  [$I.SET_DEGRADED_CHUNK_READER](reader) {
    this[I.CHUNK_READER] = reader;
  }
}
