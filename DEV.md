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
  - Public static `static highWaterMark()` / `static tmpdir()` — ergonomic
    string-keyed API, delegate to the abstract `_S` members via `this`.
  - Instance getters `get highWaterMark()` / `get tmpdir()` — delegate to
    the public static via `new.target` (`this[I.CONSTRUCTOR].highWaterMark()`).
- `Parser.mjs` (sibling of `Abstract.mjs`) defines the `returns` parsers:
  - `NonNegativeInteger` — `highWaterMark` must return `>= 0` integer (bytes).
  - `AbsolutePath` — `tmpdir` must return an absolute path (POSIX `/` or
    Windows drive/UNC).
- `.returns(...)` validates the base default implementations and documents
  the contract, but **cannot trap subclass overrides** — `extends` is not
  interceptable by the abstract constructor proxy, so a subclass's own
  static overrides bypass runtime validation.
- For full enforcement of subclass overrides, downstream wraps the subclass
  with `SubConstructorProxy(Sub)` from `@produck/es-abstract`. This is a
  documented convention (option A): produck users know the tool, and bad
  return values surface in their unit tests during development.
