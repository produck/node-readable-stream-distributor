import * as Options from '../Options/index.mjs';

import { I, $I, A } from './_Symbol.mjs';
import { DISTRIBUTOR, _A } from './_External.mjs';

export default class ForkedReadableStream extends ReadableStream {
  [I.LABEL];
  [A.I.READER];
  [$I.CANCELLED] = false;
  [I.DONE] = false;

  constructor(distributor, bufferReader, label) {
    const registry = distributor[DISTRIBUTOR.A.$I.REGISTRY];
    const highWaterMark = Options.Get.ForkHighWaterMark(distributor);
    let _controller;

    const start = (controller) => {
      _controller = controller;
    };

    const pull = async (controller) => {
      if (this[$I.CANCELLED] || this[I.DONE]) {
        return;
      }

      // The consumer side does exactly one thing: read its own ChunkReader.
      // Driving the source, waiting when short and rejecting on source error
      // all belong to the reader's read path (see ChunkReader/Abstract.mjs);
      // a rejection here surfaces as the stream's error automatically.
      const result = await this[A.I.READER][_A.READER.$I.ENSURE_THEN_READ]();

      if (result.done) {
        this[I.DONE] = true;
        controller.close();
        registry.prune(this);

        return;
      }

      controller.enqueue(result.value);
    };

    const cancel = () => {
      if (this[$I.CANCELLED]) {
        return;
      }

      this[$I.CANCELLED] = true;
      registry.prune(this);
    };

    super({ start, pull, cancel }, { highWaterMark });
    this[I.LABEL] = label;
    this[A.I.READER] = bufferReader;
    registry.add(this, _controller);
  }

  get [A.$I.READER]() {
    return this[A.I.READER];
  }

  [$I.SET_DEGRADED_CHUNK_READER](reader) {
    this[A.I.READER] = reader;
  }
}
