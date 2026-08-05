import { IDistributor as ID } from '../Symbol.mjs';

import { IForkedReadableStream as I } from './Symbol.mjs';

export default class ForkedReadableStream extends ReadableStream {
  [I.LABEL];
  [I.DISTRIBUTOR];
  [I.CONTROLLER];
  [I.CONSUMED] = 0;
  [I.CANCELLED] = false;
  [I.DONE] = false;

  /**
   * @param {import('../Abstract.mjs').default} distributor
   * @param {string} label
   */
  constructor(distributor, label) {
    super({
      start: (controller) => {
        this[I.CONTROLLER] = controller;
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
        this[I.DISTRIBUTOR][ID.COPIES].delete(this);

        // TODO: if all copies gone → cancel source reader
      },
    });

    this[I.LABEL] = label;
    this[I.DISTRIBUTOR] = distributor;
  }
}
