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

The `ChunkReader` hierarchy already reflects this split:

- `BufferChunkReader` reads the shared `ChunkStash` directly (memory path).
- `AbstractDegradedChunkReader` is the degradation branch's reader and its
  instances only read. The write side lives on a paired internal abstract
  `AbstractTransferrer`: concrete backends implement a `Transferrer`
  subclass (`_I.DUMP` transfers the whole stash into the degraded target;
  the distributor seals the stash (drop) after the dump completes; `_I.WRITE` appends live chunks) and hang its configured
  instance on the concrete reader's one-time static `transferrer`. The
  transferrer records a per-stash dumping Promise; reader instances await
  it during init via the `chunkStashDumping` getter, so reads never see a
  half-dumped target.

The current shape already fits: `highWaterMark` is the knob the distributor
asks downstream for; the degradation backend is delivered as a reader +
transferrer pair. A future refactor would:

- Extract a strategy interface for the overflow store (write chunk records,
  read them back, clean up).
- Provide a Node implementation backed by the filesystem (`node:fs`).
- Provide a browser implementation backed by IndexedDB / OPFS
  (localStorage only for tiny payloads).

## Naming note

`tmpdir` is filesystem-flavored naming. The write side is now realized as
the medium-neutral `Transferrer` (dump the stash / append live chunks), so
degradation never implies a specific storage medium.
