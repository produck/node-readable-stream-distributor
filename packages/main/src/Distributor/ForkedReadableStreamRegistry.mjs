export default class ForkedReadableStreamRegistry {
  forks = new Set();

  add(fork) {
    this.forks.add(fork);
  }

  prune(fork) {
    this.forks.delete(fork);
  }

  [Symbol.iterator]() {
    return this.forks[Symbol.iterator]();
  }
}
