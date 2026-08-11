import * as DistributorSymbol from '../Symbol.mjs';

import { I, $I } from './Symbol.mjs';

export default class ForkedReadableStream extends ReadableStream {
  [I.LABEL];
  [I.DISTRIBUTOR];
  [I.CONTROLLER];
  [I.CHUNK_READER] = null;
  [I.CANCELLED] = false;
  [I.DONE] = false;

  /**
   * @param {import('../Abstract.mjs').default} distributor
   * @param {string} label
   */
  constructor(distributor, label) {
    let _controller;

    super({
      // start 在 super() 内同步调用，this 处于 TDZ，只能用局部变量桥接
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
        this[I.DISTRIBUTOR][DistributorSymbol.$I.COPIES].delete(this);

        // TODO: if all copies gone → cancel source reader
      },
    });

    this[I.LABEL] = label;
    this[I.DISTRIBUTOR] = distributor;
    this[I.CONTROLLER] = _controller;
  }

  /** @param {import('../../chunk-reader.mjs').default} reader */
  [$I.SET_CHUNK_READER](reader) {
    this[I.CHUNK_READER] = reader;
  }

  [$I.GET_CHUNK_READER]() {
    return this[I.CHUNK_READER];
  }
}
