---
applyTo: '**'
---

# Repository override: 10-produck-node

Deltas against `.github/instructions/produck/10-produck-node.instructions.md`.

## Document directory

- The baseline requires a root `docs/` directory. This repository has none:
  root-level `*.md` files carry that role.
  - `DEV.md`: current conclusions per topic (decisions, trade-offs, measured
    evidence).
  - `DESIGN.md`: design document (semantics, architecture, lifecycle,
    observability).
  - `SWITCHING.md`, `WAITING.md`, `BROWSER.md`: migration notes, open items and
    browser environment.
- Documents are written in Chinese prose with English terms, headings `#`
  followed by a blockquote lead.

## Package tests

- The package `test` script is `node test/index.mjs`, without `--test`.
- Test-side deltas live in the 12 override in this folder.
