import { IDistributor as ID } from '../Symbol.mjs';

import { IForkedReadableStream as I } from './Symbol.mjs';

export default class ForkedReadableStream {
  /** @param {{ label: string, distributor: import('../Abstract.mjs').default }} options */
  constructor(options) {
    this[I.LABEL] = options.label;
    this[I.DISTRIBUTOR] = options.distributor;
    this[I.STREAM] = null;
    this[I.CONTROLLER] = null;
    this[I.READER] = null;
    this[I.CONSUMED] = 0;
    this[I.CANCELLED] = false;
    this[I.DONE] = false;
  }

  get label() {
    return this[I.LABEL];
  }

  get stream() {
    return this[I.STREAM];
  }

  unregister() {
    if (this[I.CANCELLED]) {
      return;
    }

    this[I.CANCELLED] = true;
    this[I.DISTRIBUTOR][ID.COPIES].delete(this);

    // TODO: if all copies gone → cancel source reader
  }
}
