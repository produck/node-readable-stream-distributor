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
- **对外导出限制**：`index.mjs` 只导出受保护/抽象空间
  （`$I`/`$S`/`_I`/`_S`），**严格不导出私有空间 `I`/`S`**（仅模块
  内部使用）。
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

## 2026-08-16

### START_INITIALIZE control moves to the Distributor (reversed)

- Reversed the "subclass self-init" decision. The Distributor now calls
  `$I.START_INITIALIZE`, not the subclass.
- Reason: subclass self-init let the downstream implementation do extra work
  AFTER triggering init, which created state uncertainty. The clean contract
  is: the subclass constructor only arranges context (stashes params) and
  defines `_I.INITIALIZE`; the Distributor starts the initialization at a
  fixed, controlled point (same tick as construction).
- The mechanism is unchanged (`$I.START_INITIALIZE` + once-guard + same-tick
  TODO); only the caller changes.
- New contract for subclasses: constructor = context arrangement only. No
  init trigger, no post-init work.

## 2026-08-20

### ChunkReader 分叉：AbstractFallbackChunkReader 抽象中间层

- `BufferChunkReader` 直接消费共享 `ChunkStash`（内存路径，按 index 读，
  `done` 由 `stash.length` 决定）。
- 新增 `AbstractFallbackChunkReader`（`ChunkReader/Fallback.mjs`）：回退
  读取器家族的抽象中间层。`_I.INITIALIZE` 模板强制切换公共动作——打开/
  填充回退存储（子类 `_I.OPEN`）→ 对共享 `ChunkStash` 执行一次 `drop()`。
  具体存储读写由子类实现 `_I.OPEN` + 继承的 `_I.READ` / `_I.CLOSE`。
- 构造上下文 `bufferList` 更名 `chunkStash`（语义即共享 `ChunkStash`），
  `Symbol.mjs` 的 `$I.BUFFER_LIST` 改为 `$I.CHUNK_STASH`，新增 `_I.OPEN`。
- `TemporaryFileChunkReader`（未来）将作为 `AbstractFallbackChunkReader`
  的 Node 文件系统实现；浏览器分支（IndexedDB / OPFS）同挂其下——呼应
  BROWSER.md 的存储降级策略抽象。

## 2026-08-26

### Fallback 静态转存设计（`AbstractFallbackChunkReader`）

- 转存职责在静态侧：抽象静态 `_S.DUMP(chunkStash)`（返回 PromiseOr，
  会被转为 Promise），公开静态 `dump(chunkStash)` 调用它，Promisify 并
  做抽象层异常处理修饰，把生成的 Promise 记录到静态 WeakMap
  `S.DUMPING`（`ChunkStash` ↔ 转存 Promise）。
- 实例级 `getChunkStashDumping()` 从 `S.DUMPING` 查询；实例构造经
  受保护 `$I.CHUNK_STASH` 持有共享 stash（维持受保护、不新增符号），
  所有初始化过程 `await dumping`——**仅阻塞、不提供产物**。
- 转存产物经回退策略自备的 WeakMap 传递；`id`/文件名等是回退策略
  内部细节（移除分发器 `id`）。
- 移除 `_I.OPEN`（文件类领域术语；抽象初始化已含 open 概念）。

### 目录安排约定

- 内部类在对应的目录向下扩展；子类平行于其抽象类建立目录进行实现
  （抽象类 `Abstract.mjs` 在家族目录根部，每个子类各建平行子目录，
  内部按 `Concrete.mjs` + `index.mjs` + `Symbol.mjs` 组织）。

### 目录安排约定（取舍：维持统一规则）

- 曾考虑"按需建目录"的判别规则（仅被扩展/有专属符号/独立导出的类
  建目录，叶子类平级），但特例过多难以遵守，放弃。
- 维持"一目录一类"的统一规则，接受少量目录浪费：一致性换来机械可
  执行（无需判断，任何类都进目录），避免规则漂移。
- 该模式本质类似 C# partial class 的设计目标——一个复杂类是内部
  相关资源的混合体——但更灵活：无需语言标记，目录即文件系统层的
  资源聚合（`Concrete.mjs`/`Abstract.mjs` + `Symbol.mjs` + `index.mjs` +
  子类目录），打开目录即见类的全部。
- `Concrete` 与 `Abstract` 存在性互斥：一个目录内主类文件只有一个
  （具体 → `Concrete.mjs`，抽象 → `Abstract.mjs`）。
- "结构碎"的收益：每文件职责单一（类本体/符号/导出分离），目录路径
  即命名空间，跨模块符号冲突被物理隔离（呼应 Symbol 模块 ≤6 键约束）。
- 目录根部可并存共享模块与类聚合（如 `Distributor/` 根部 `Parser.mjs`
  - `Symbol.mjs` + `index.mjs`，同时 `ChunkStash/`、`ForkedReadableStream/`
    各聚合类资源）。

## 2026-08-27

### BufferChunkReader 单文件特例（迁移）

- 迁移 `BufferChunkReader` 从 `ChunkReader/Buffer.mjs` 到
  `Distributor/BufferChunkReader.mjs`（单文件，文件名即类名）。
- 引入目录约定的**唯一特例**：极端简化（无子类、无专属符号、无需
  独立导出入口）时可用单文件模式，不展开目录。
- `ChunkReader/index.mjs` 不再导出 `BufferChunkReader`；改由
  `Distributor/index.mjs` 导出。

### Fallback 展开目录（迁移）

- 迁移 `AbstractFallbackChunkReader` 从 `ChunkReader/Fallback.mjs` 到
  `ChunkReader/Fallback/Abstract.mjs`，展开为独立目录。
- `ChunkReader/Fallback/` 目录：`Abstract.mjs`（抽象中间层）+
  `index.mjs`（`export { default as Abstract }`）。Fallback 专属符号
  （如未来 `S.DUMPING` / `_S.DUMP`）实现时再建 `Fallback/Symbol.mjs`。
- `ChunkReader/index.mjs` 经 `export { Abstract as AbstractFallbackChunkReader }`
  转发（`Fallback/index.mjs` 导出的是 named `Abstract`，非 default）。

### Fallback 位置修正（平行于抽象类类目录）

- 昨天落笔的目录约定对"平行"理解有偏差：误把子类目录画在抽象类
  家族目录内部（向下扩展）。
- 正确规则：**子类**是继承关系，其目录**平行于抽象类的类目录**（同一
  父目录下的兄弟层级），而非在抽象类目录内向下扩展；**向下扩展仅适用
  于非继承关系的内部类**。
- `AbstractFallbackChunkReader` 正确位置为 `Distributor/FallbackChunkReader/`
  （目录名对应类名：类名去 `Abstract` 前缀；与 `ChunkReader/` =
  `AbstractChunkReader` 的类目录平行），改由 `Distributor/index.mjs`
  导出；`ChunkReader/index.mjs` 不再导出它。
- `BufferChunkReader` 位于 `Distributor/BufferChunkReader.mjs` 即此规则
  的旁证（子类平行于抽象类类目录）。

## 2026-08-28

### FallbackChunkReader 自有 Symbol 与 dump 机制落地

- 补建 `FallbackChunkReader/Symbol.mjs`（此前迁移时漏建，违反"一目录
  一类：Abstract/Concrete + index + Symbol"约定）。
- Fallback 家族自有符号：`S.DUMPING`（静态 WeakMap 键）、`_S.DUMP`
  （抽象静态转存）。同时修复残留的裸 `_I.OPEN` 引用（未 import 的
  bug）——`_I.OPEN` 不再使用（设计已移除）。
- `AbstractFallbackChunkReader` 落地已认可设计：
  - `static [S.DUMPING] = new WeakMap()`：stash ↔ dumping Promise 注册表。
  - `static dump(chunkStash)`：调用 `_S.DUMP`，经
    `Promise.resolve().then(...)` Promisify（同步异常转 rejected），
    记录到 `S.DUMPING`；失败经 `.catch()` 做**抽象层异常转义**——
    包装为可辨识的 dumping 错误（`Ow.Error.Common`，原始错误作
    `cause`）。
  - 实例 `getChunkStashDumping()`：经 `this.constructor[S.DUMPING]`
    查询本实例 stash 的转存 Promise。
  - `_I.INITIALIZE` 返回 `this.getChunkStashDumping()`（await 屏障，
    仅阻塞、不产产物）。
- **私有符号空间不对外导出**：`index.mjs` 只导出受保护/抽象空间
  （`$I`/`$S`/`_I`/`_S`），严格不导出 `I`/`S`。据此移除
  `ChunkStash/index.mjs` 的 `I` 导出与 `FallbackChunkReader/index.mjs`
  的 `S` 导出（`S.DUMPING` 仅模块内部使用）。
- **实例访问自身静态成员不用 `this.constructor`**（不安全），采用
  `I.CONSTRUCTOR` 符号 + 构造时 `new.target` 捕获（与
  `Distributor/Abstract.mjs` 一致）。`FallbackChunkReader` 新增
  `I.CONSTRUCTOR`，`getChunkStashDumping()` 经
  `this[I.CONSTRUCTOR][S.DUMPING]` 访问静态 WeakMap。
