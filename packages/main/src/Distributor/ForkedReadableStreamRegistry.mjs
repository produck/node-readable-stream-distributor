export default class ForkedReadableStreamRegistry {
  forks = new Map();

  add(fork, controller) {
    this.forks.set(fork, controller);
  }

  prune(fork) {
    this.forks.delete(fork);
  }

  [Symbol.iterator]() {
    return this.forks[Symbol.iterator]();
  }
}
