import * as Assert from './Assert.mjs';

const items = [
  {
    name: 'MaxStashByteLength',
    defaultValue: (1 << 10) ** 3,
    assert: Assert.NonNegativeInteger,
  },
  {
    name: 'MaxBacklogWarningByteLength',
    defaultValue: (options) => options.MaxStashByteLength(options),
    assert: Assert.NonNegativeInteger,
  },
  {
    name: 'DegradeOnStashFullAndDone',
    defaultValue: false,
    assert: Assert.Boolean,
  },
];

export { items };
