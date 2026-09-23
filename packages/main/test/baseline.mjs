import {
  Distributor,
  DegradedChunkReader,
  SYMBOL,
  Transferrer,
} from '../src/index.mjs';

const { DEGRADED_CHUNK_READER_CTOR } = SYMBOL.DISTRIBUTOR._S;
const { _I: READER, _S: READER_S } = SYMBOL.DEGRADED_CHUNK_READER;
const { _I: TRANSFERRER } = SYMBOL.TRANSFERRER;

export const mediums = [];

export const makeSource = (chunks = []) => {
  let pulled = 0;

  return new ReadableStream({
    pull(controller) {
      if (pulled < chunks.length) {
        controller.enqueue(Buffer.from(chunks[pulled]));
        pulled++;
      } else {
        controller.close();
      }
    },
  });
};

export const drain = async (stream) => {
  const got = [];

  for await (const chunk of stream) {
    got.push(chunk.toString());
  }

  return got;
};

export const settle = async (turns = 6) => {
  for (let i = 0; i < turns; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

export class TestTransferrer extends Transferrer {
  constructor(...args) {
    super();
    this.args = args;
    mediums.push(this);
  }

  [TRANSFERRER.DUMP]() {}

  [TRANSFERRER.WRITE]() {}

  [TRANSFERRER.DROP]() {}
}

export class TestDegradedChunkReader extends DegradedChunkReader {
  static [READER_S.TRANSFERRER_CTOR] = TestTransferrer;

  [READER.INITIALIZE]() {}

  [READER.SEEK]() {
    return false;
  }

  [READER.READ]() {
    return { done: true, value: undefined };
  }

  [READER.CLOSE]() {}
}

export class TestDistributor extends Distributor {
  static [DEGRADED_CHUNK_READER_CTOR] = TestDegradedChunkReader;
}

export const makeDistributor = (chunks = []) =>
  new TestDistributor(makeSource(chunks));
