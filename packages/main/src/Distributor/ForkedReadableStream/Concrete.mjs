import * as DistributorSymbol from '../Symbol.mjs';

import { I, $I } from './Symbol.mjs';

export default class ForkedReadableStream extends ReadableStream {
  [I.LABEL];
  [I.DISTRIBUTOR];
  [I.CONTROLLER];
  [I.CHUNK_READER] = null;
  [I.CANCELLED] = false;
  [I.DONE] = false;

  constructor(distributor, label) {
    let _controller;

    super({
      start: (controller) => {
        _controller = controller;
      },
      pull: async (controller) => {
        void controller;
        // TODO: pull chunk from distributor and enqueue
      },
      cancel: () => {
        if (this[I.CANCELLED]) {
          return;
        }

        this[I.CANCELLED] = true;
        this[I.DISTRIBUTOR][DistributorSymbol.$I.REGISTRY].delete(this);

        // TODO: if all copies gone → cancel source reader
      },
    });

    this[I.LABEL] = label;
    this[I.DISTRIBUTOR] = distributor;
    this[I.CONTROLLER] = _controller;
  }

  get [$I.CHUNK_READER]() {
    return this[I.CHUNK_READER];
  }

  set [$I.CHUNK_READER](reader) {
    this[I.CHUNK_READER] = reader;
  }
}
