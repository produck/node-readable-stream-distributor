# DEV — Implementation Decision Log

## 2026-07-30

### Architecture style: `@produck/es-abstract`

- Adopted `@produck/es-abstract`, following the `Abstract()` + `Member.Method()`
  convention for declaring abstract members.
- `ChunkReader` declared as abstract via
  `Abstract(Class, Abstract({ [I.READ]: M.Method() }))`.
- `BufferReader` / `FileReader` implement `[IReader.READ]()`.

### Symbol conventions

- `I` / `S` — Instance / Static scope.
- `#` / `$` / `_` — private / protected / abstract (Symbol description prefix).
- `$I` (`.$*`) — instance-protected: accessible within the design family
  (e.g. `Distributor.$I.COPIES` is used by both `Abstract.mjs` and
  `ForkedReadableStream`).
- Public members use plain string keys, never Symbols.
- Symbol module exports at most 6 keys: `I`, `$I`, `_I`, `S`, `$S`, `_S`.
  The module path serves as the namespace.
- Currently used in this project:
  - `_I.READ` (`._read()`) — ChunkReader abstract instance method
    (in `Distributor/Symbol.mjs`, to be moved).
  - `I.*` (`.#*`) — Distributor instance-private state.
  - `$I.COPIES` (`.$copies`) — Distributor instance-protected, shared with
    ForkedReadableStream.

### Static + instance delegation: highWaterMark / tmpdir

- `highWaterMark` and `tmpdir` are `static` methods. Instance getters
  delegate through `new.target`.
- Subclasses override the static method to change behavior; no need to
  override the instance getter.
- `new.target` captured in constructor as `this[$.CONSTRUCTOR]`.
- Per-instance overrides (e.g. via constructor options) are left to
  subclasses — the base class does not provide this.

### Public API

- `fork({ label })` — register a new consumer copy (was `register`;
  renamed to `fork` for better streaming semantics).
- `destroy()` — force-destroy the distributor.
- `get highWaterMark()` — delegates to `new.target.highWaterMark()`.
- `get tmpdir()` — delegates to `new.target.tmpdir()`.

### Module naming

- Entry file named `Distributor.mjs` (not `index.mjs`). Package export
  shape deferred for now.
- `Symbol.mjs` uses capital `S`, consistent with kitty and other produck
  projects.
