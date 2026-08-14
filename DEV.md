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

## 2026-08-10

### ReadableStreamDistributor becomes a WHATWG EventTarget

- `ReadableStreamDistributor extends EventTarget` — observable lifecycle via
  standard `addEventListener` / `dispatchEvent`.
- `fork` and `destroy` events dispatched on state change. Future events:
  `drain` (copies to zero), `overflow` (memory→disk), `error`.
- Keeps the package WHATWG-oriented (no Node EventEmitter dependency);
  Node users bridge via `stream.toWeb()` if needed.
- Symbol-keyed members make the `extends` chain collision-safe.

### highWaterMark / tmpdir become static abstract members

- Declared via `Abstract.Static({ [_S.TMPDIR]: M.Method(), ... })` (note:
  static abstract members require `Abstract.Static({...})`, not `Abstract({...})`).
- Base class provides **default implementations** on the `_S` members
  (`os.freemem()`, `process.env.TMPDIR || os.tmpdir()`) — downstream
  subclasses may override `[_S.HIGH_WATER_MARK]()` / `[_S.TMPDIR]()` or
  inherit the defaults.
- `ReadableStreamDistributor` cannot be constructed directly; it is an
  abstract constructor.
- Two-layer delegation:
  - Public static `static get highWaterMark` / `static get tmpdir` — ergonomic
    string-keyed getters (no-arg accessors), delegate to the abstract `_S`
    members via `this`.
  - Instance getters `get highWaterMark` / `get tmpdir` — delegate to
    the public static getters via `new.target`
    (`this[I.CONSTRUCTOR].highWaterMark`).
- `Parser.mjs` (sibling of `Abstract.mjs`) defines the `returns` parsers:
  - `NonNegativeInteger` — `highWaterMark` must return `>= 0` integer (bytes).
  - `AbsolutePath` — `tmpdir` must return an absolute path, implemented via
    Node `path.isAbsolute()` (package is Node-only for now; no browser plan).
- `.returns(...)` validates the base default implementations and documents
  the contract, but **cannot trap subclass overrides** — `extends` is not
  interceptable by the abstract constructor proxy, so a subclass's own
  static overrides bypass runtime validation.
- For full enforcement of subclass overrides, downstream wraps the subclass
  with `SubConstructorProxy(Sub)` from `@produck/es-abstract`. This is a
  documented convention (option A): produck users know the tool, and bad
  return values surface in their unit tests during development.

## 2026-08-11

### Reader terminology disambiguation

- `READER` was overloaded across two concepts; split into canonical terms
  (also recorded in DESIGN.md "Chunk 读取器"):
  - `ChunkReader` — the piece-by-piece chunk-reading device owned by each
    copy (`ForkedReadableStream.I.CHUNK_READER`, `$I.CHUNK_READER`).
  - `source reader` — the distributor-side pull device
    (`Distributor.I.SOURCE_READER`).
- `ForkedReadableStream.$I.CHUNK_READER` is a **protected** get/set accessor
  for the copy's chunk reader. It is a symbol (`$I`) because downstream
  consumers receive the `ForkedReadableStream` instance directly from
  `fork()`, so a public accessor would expose the internal reader and let
  consumers interfere with the stream's own pulls. The Distributor swaps
  readers via `copy[$I.CHUNK_READER] = newReader`. No validation (trusted
  caller); reader swap is transparent to the copy because both
  `BufferReader`/`FileReader` implement the same `read()` interface.

### `start` callback cannot access `this`

- In `ForkedReadableStream extends ReadableStream`, the `start` callback
  runs **synchronously inside `super()`**, so `this` is in the temporal dead
  zone. It must capture the controller via a local variable (`_controller`)
  bridged to `this[I.CONTROLLER]` after `super()` returns.
- `pull` / `cancel` are called asynchronously (after construction), so they
  may use `this` directly.
- Earlier assumption that `void this` inside `start` was runtime-safe was
  wrong: lint only checks statically, not TDZ execution.

## 2026-08-13

### ChunkReader lifecycle: close() + initialize()

- `ChunkReader` gains a public `close()` (idempotent, base-guarded via
  `I.CLOSED`), delegating teardown to abstract `_I.CLOSE` (base default
  no-op for resource-free readers like BufferChunkReader).
- Initialization uses the abstract layer as the readiness barrier:
  - `_I.INITIALIZE` — abstract member, returns `PromiseLike<undefined>` or
    `undefined` (sync init, no barrier). Side effects only.
  - `I.INITIALIZED` — private member holding the barrier promise (or
    undefined); `read()`/`close()` unconditionally `await` it.
  - `$I.START_INITIALIZE` — protected trigger, guarded to run once
    (`I.INITIALIZATION_STARTED`). Calls `_I.INITIALIZE` and stores the
    result.
- **Subclass self-init** (decided): the subclass defines `_I.INITIALIZE` and
  calls `$I.START_INITIALIZE` once at the end of its own constructor (after
  stashing params). Not auto-run in the base constructor because subclass
  fields are unavailable during `super()`.
- Rationale / justification:
  - The abstract barrier makes "read waits for readiness" an un-forgettable
    invariant (vs. per-implementation awaiting inside `_I.READ`).
  - The `$I.START_INITIALIZE` autonomy (subclass decides WHEN init starts
    and what to do AFTER init) is forward-looking: the future storage
    degradation strategy (BROWSER.md) needs backends with differing init
    timing and post-init work (Node temp files vs IndexedDB/OPFS vs pure
    memory). This hook is that abstraction's first landing point.
