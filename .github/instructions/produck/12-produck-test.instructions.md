---
applyTo: '**'
---

<!-- managed-by: @produck/agent-toolkit -->
<!-- source: .github/distribution/produck/12-produck-test.instructions.md -->

# Test Authoring Baseline

## Scope

- Applies to Node.js repositories in the organization.
- This document governs how tests are authored, structured, and executed.
- Repository-specific rules may add stricter requirements; they override this
  baseline when they conflict.

## Framework

- MUST use Node.js standard library test runner (`node:test`) with `describe`
  and `it`.
- Do not introduce a third-party test framework unless repository owners
  explicitly document the justification.

## File structure

- Each package must have a dedicated test directory: `test/`.
- Tests are organized in individual files per subject area under `test/`.
- Each package MUST provide a single entrypoint file: `test/index.mjs`.
- The entrypoint imports all test files to be executed.

Example entrypoint:

```js
import './feature-a.test.mjs';
import './feature-b.test.mjs';
```

## Single Entrypoint Rule (required)

- Execution MUST always go through the entrypoint file.
- Command-line execution MUST NOT use the `--test` flag. Use
  `node <entrypoint>` directly.
- Correct: `node test/index.mjs`
- Wrong: `node --test` or `node --test test/feature-a.test.mjs`
- All tooling (scripts, CI, coverage) must target the entrypoint only.

## Test case rules

- Each test case must be independently executable.
- Test cases must not depend on execution order or shared mutable state from
  other cases.
- Avoid global side effects that persist across test cases.
- Clean up resources (temp files, open handles) at the end of each test case.

## API usage conventions

- Callback functions for `describe` and `it` MUST use arrow functions. Do not
  use `function` keyword or method shorthand syntax.

  Correct:

  ```js
  describe('my feature', () => {
    it('should work', () => {
      // assertions
    });
  });
  ```

  Wrong:

  ```js
  describe('my feature', function () {
    it('should work', function () {
      // assertions
    });
  });
  ```

- Deep nesting of `describe` blocks can make test output harder to read. When
  nesting becomes excessive, split the test file and use `await import()` to
  reorganize — this keeps the actual test code at shallow nesting levels.

## Naming conventions

- Test files use the `.test.mjs` suffix.
- Top-level `describe` label should match the subject being tested (for example
  the module name or command name).
- `it` labels should describe the expected behavior in plain language.

### Suite name conventions

The `describe` suite name encodes the member type under test using a prefix
convention:

| Prefix | Meaning                                              | Example                   |
| ------ | ---------------------------------------------------- | ------------------------- |
| `::`   | Class static public member or namespace static       | `describe('::parse()')`   |
| `.`    | Class instance member                                | `describe('.validate()')` |
| `()`   | Marks the target as a function (composable)          | `describe('::create()')`  |
| `>`    | Return-value testing, nested inside a function suite | `describe('>result')`     |
| `#`    | Event emitter — test event dispatch behavior         | `describe('#error')`      |

Prefixes and `()` compose freely. For example:

| Suite name    | Meaning                       |
| ------------- | ----------------------------- |
| `::parse()`   | Static function `parse`       |
| `::VERSION`   | Static property `VERSION`     |
| `.validate()` | Instance method `validate`    |
| `.name`       | Instance property `name`      |
| `validate()`  | Standalone function (unbound) |

Examples:

```js
describe('::parse()', () => {
  it('should parse valid input', () => {
    /* ... */
  });
});

describe('::VERSION', () => {
  it('should be a semver string', () => {
    /* ... */
  });
});

describe('.validate()', () => {
  it('should reject invalid data', () => {
    /* ... */
  });

  describe('>result', () => {
    it('should be a boolean', () => {
      /* ... */
    });
  });
});

describe('.name', () => {
  it('should be non-empty', () => {
    /* ... */
  });
});

describe('#error', () => {
  it('should emit on failure', () => {
    /* ... */
  });
});
```

## Local debug workflow (recommended)

When debugging a failing test case:

1. Add `{ only: true }` to the target `it` and all ancestor `describe` blocks.
2. Run `node --test-only test/index.mjs`.
3. Verify the issue is isolated.
4. Remove all `only` markers.
5. Run full regression: `node test/index.mjs`.

Rules for `only` mode:

- `--test-name-pattern` does NOT match tests nested inside `describe()` blocks
  — it may silently run zero tests. Do not use it for focused runs.
- Always remove `only` markers before committing.
- Never commit a test file with `{ only: true }` present.

## Coverage

- Coverage is governed by `produck:coverage` script and `c8`.
- Scoped coverage (for partial branch verification during development):
  `npm exec -- c8 --reporter=lcov --reporter=html --reporter=text-summary node --test-only test/index.mjs`
- Before merge or release, run full coverage via `npm run produck:coverage`.
- See [Node.js Baseline](10-produck-node.instructions.md) for coverage script
  governance details.

## Regression discipline

- Before merge or release: restore executable test commands and fix all failing
  tests.
- Temporary non-executable state or failing tests are allowed for intermediate
  commits.
- Full regression MUST pass before a release commit is made.
