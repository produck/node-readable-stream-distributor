# Browser Compatibility Direction

Not implemented today (the package is Node-only). This document records the
design direction in case browser support is pursued in the future.

## Current Node coupling

The streaming and observability core is already portable:

- WHATWG `ReadableStream` — the stream model.
- `ForkedReadableStream extends ReadableStream` — consumer-facing copies.
- `EventTarget` — observable lifecycle.

The only Node-specific coupling is the **disk spillover** (memory → storage
degradation): `node:fs`, `node:os`, `node:path`, `node:crypto`.

## Direction

The Distributor must NOT embody filesystem concepts (e.g. `tmpdir`). The disk
spillover is one implementation of a **storage degradation strategy layer**.

The current shape already fits: `highWaterMark` + `tmpdir` are the two knobs
downstream implements via the `_S` abstract members. A future refactor would:

- Extract a strategy interface for the overflow store (write chunk records,
  read them back, clean up).
- Provide a Node implementation backed by the filesystem (`node:fs`).
- Provide a browser implementation backed by IndexedDB / OPFS
  (localStorage only for tiny payloads).

## Naming note

`tmpdir` is filesystem-flavored naming. When the degradation strategy is
abstracted, prefer a neutral name such as `overflowStore` / `spillStore`.
