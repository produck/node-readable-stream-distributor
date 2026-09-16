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
  subclass (`_I.DUMP` transfers the whole stash into the degraded target
  and drops it on success; `_I.WRITE` appends live chunks) and declare its
  class on the concrete reader's static `_S.TRANSFERRER_CTOR`. The
  transferrer owns all non-blocking scheduling: the stash's chunks are
  fanned into the same FIFO as the live ones, a chunk counts as readable
  once it is accepted - on the medium or still queued - and readers only
  wait for their own position (`$I.WAIT_CHUNK`), so reads never see a
  half-dumped target and never wait for the bulk transfer to finish.

The current shape already fits: `stashByteLimit` is the knob the distributor
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
