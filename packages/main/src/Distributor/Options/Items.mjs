import * as Assert from './Assert.mjs';

const items = [
  // Read on every pull, by the degrade probe (degradeIfNeeded()).
  {
    name: 'MaxStashByteLength',
    defaultValue: (1 << 10) ** 3,
    assert: Assert.NonNegativeInteger,
  },
  // Read after every write to the transferrer (observeBacklog()).
  {
    name: 'MaxBacklogWarningByteLength',
    defaultValue: (options) => options.MaxStashByteLength(options),
    assert: Assert.NonNegativeInteger,
  },
  // Read by the same probe, once the stash is both over the limit and done.
  {
    name: 'DegradeOnStashFullAndDone',
    defaultValue: false,
    assert: Assert.Boolean,
  },
  // Read once per fork, at construction; older copies keep their value.
  {
    name: 'ForkHighWaterMark',
    defaultValue: 1,
    assert: Assert.HighWaterMark,
  },
];

export { items };
