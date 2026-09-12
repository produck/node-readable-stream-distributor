# DEV — Implementation Notes

> 组织方式：按**主题/方面**，而非日期。每个主题只记**当前有效结论**；
> 同一主题后到的决策覆盖先前的（越新越有效），日期仅作追溯标注。

## 架构基座

### 抽象层：@produck/es-abstract

- `Abstract(cls, Abstract({...}))` 声明抽象实例成员；`Abstract.Static({...})`
  声明抽象静态成员；`Member as M` 提供 `M.Method().returns(...)` 契约。
- 成员约束在**实例属性访问时惰性校验**（缺实现抛 "must be implemented
  in the subclass"），不阻断 `extends`；静态覆写同样绕过运行时校验，
  需强约束的下游用 `SubConstructorProxy(Sub)` 包裹。
- 契约返回类型用 `OrPromiseLike(...)` 表达"或同步或 Promise"：void 钩子
  标 `OrPromiseLike(Undefined)`；携带值/标志的钩子按其形态（如 `_I.SEEK`
  标 `OrPromiseLike(Boolean)`；`_I.READ` 返回 `{ value, done }`，契约保持
  宽松 `OrPromiseLike()`）。

### Symbol 约定

- 层级：`I`/`S` = 实例/静态私有；`$I`/`$S` = 受保护；`_I`/`_S` = 抽象。
- 方法符号带 `()` 后缀（`.$read()`、`._seek()`）；字段符号不带
  （`.$consumed`）；描述符：实例 `.#*` / `.$*` / `._*`，静态 `S.*`。
- `index.mjs` 只导出受保护/抽象空间（`$I`/`$S`/`_I`/`_S`），**严格不导出
  私有 `I`/`S`**。
- 单符号模块 ≤6 键；模块路径即命名空间——跨模块同词不冲突（降级
  `_I.READ` 与基类 `_I.READ` 各自独立）。
- 面向调用者的具名成员（getter、`chunkStash`）用普通字符串键。

### Static + instance 委托

- 公开静态 getter 委托 `_S` 抽象；实例经构造时捕获的 `I.CONSTRUCTOR`
  （`new.target`）委托静态侧（不用 `this.constructor`）。
- `highWaterMark` 默认 `os.freemem()`；`Parser.mjs` 提供 `.returns`
  解析器（如 `NonNegativeInteger`）。

## 观点 / 决策 / 结论

### 目录约定

- 一目录一类：主类文件 `Abstract.mjs`/`Concrete.mjs`（存在性互斥）+
  `index.mjs` + `Symbol.mjs`；目录路径即命名空间。
- **子类目录平行于抽象类类目录**（兄弟层级）；向下扩展仅限非继承的
  内部类（如 `DegradedChunkReader/Transferrer/`）。
- 叶子极端简化可用单文件特例（如 `Distributor/BufferChunkReader.mjs`）。

### Distributor（分发器）

- `extends EventTarget`（WHATWG，不依赖 Node EventEmitter）。
- 公开面：`fork(label = '<UNDEFINED>')` 注册消费拷贝并返回
  `ForkedReadableStream`（`label` 助记符，默认占位串 `'<UNDEFINED>'`，
  须为 string）；`get highWaterMark`（委托静态）；`get degraded`（代理
  `CHUNK_STASH.dropped`）；`destroy()` 为 TODO。
- 内部：`I.SOURCE_READER`（唯一 source 消费者）· `I.CHUNK_STASH`（共享
  `ChunkStash`）· `I.SOURCE_CONSUMPTION_AGENT`（消费代理）· `$I.REGISTRY`（fork 集，
  `$I.PRUNE` 清理已取消 fork）。构造校验 source 为未锁定的 WHATWG ReadableStream。
- 共享 stash 生命周期 create/push/drop **收口在分发器**。

### ChunkStash（共享内存暂存）

- 公开只读：`dropped` / `length` / `byteLength`；`get(index)` 带封存守卫；
  `chunks()` 返回有序快照迭代器。
- 写面受保护：`$I.PUSH(chunk)`、`$I.DROP()`——公开 drop 会泄漏"封存共享
  内存"的能力，封存权归**分发器**（Transferrer 只管转存，不封存）。
- 封口：保护级终态 `$I.SEALED`——内容已完整、不再进货，是"这一份可以整份
  dump 出去"的标志；已封口且 `index >= length` 才算真 `done`。

### Reader 术语

- `ChunkReader` = 各拷贝的逐块读取装置；`source reader` = 分发器侧拉取
  装置。职责不同，代码与文档不共用 `READER`。

### ChunkReader 家族

- 分叉：内存路径 `BufferChunkReader`（直接读共享 `ChunkStash`）与降级
  家族（`AbstractDegradedChunkReader` + 具体叶子）。

#### 基类 AbstractChunkReader = "有位置的读头"

- `$I`：`CONSUMED` / `CHUNK_STASH` / `READ`；`_I`：`READ`；公开只读
  `chunkStash` / `consumedChunks`。
- `$I.READ` 无就绪屏障：`_I.READ()` → 非 done 则 `CONSUMED++` →
  `{ value, done }`。它同时是消费前沿的推进点与"是否再进一步"的判定
  位置（见「读路径」）。
- 不持初始化/关闭（已迁降级家族）；构造直接收 `chunkStash`（不包对象）。

#### BufferChunkReader（内存 · 即时读）

- 只实现 `_I.READ`（按 `CONSUMED` 下标读共享 stash，`done` 由
  `stash.length` 决定）；构造即就绪——分发器无需请求初始化，也无需
  close（无资源）。

#### AbstractDegradedChunkReader（降级 · 生命周期持有者）

- `I`：`CONSTRUCTOR` / `INITIALIZED` / `CLOSED`；`$I`：`REQUEST_INITIALIZE`
  / `CLOSE`；`_I`：`READ` / `INITIALIZE` / `CLOSE` / `SEEK`；`S`：
  `TRANSFERRER`（一次性静态配置，未配置不能 `new`）。
- 初始化经 `I.INITIALIZED`（`_I.INITIALIZE` 返回的 Promise）承接；
  `_I.INITIALIZE` 默认实现 = dumping 屏障（`chunkStashDumping`）；叶子要
  open + 定位则覆写它。

### 初始化与关闭（归降级家族）

- 播种 = **请求初始化** `$I.REQUEST_INITIALIZE(progress)`：同步
  `CONSUMED = progress` 后发起 `_I.INITIALIZE`（就绪由 `I.INITIALIZED`
  承接）。曾用构造器传 `progress`、曾名 `START_INITIALIZE` + once-guard
  （均已废）。
- **分发器是唯一调用者**（同一 tick：构造 → 请求初始化）；无守卫，
  初始化完全受分发器控制。
- `$I.CLOSE`：`I.CLOSED` 幂等 → await `I.INITIALIZED` → `_I.CLOSE`；
  `get closed` 暴露状态。内存读器不在本契约内（无 close）。

### 读路径

- 基类 `$I.READ` 驱动统一承担 CONSUMED 推进（只在基类一处）。
- `$I.READ` 同时是**前沿消费接触点**与**"是否再进一步"的判定位置**：
  撞前沿时催共享取块层并 `await`（该 `await` 即背压闸），不得返回假
  `done`；等待须 Promise / 事件驱动，不得循环重查（信号形态待定）。
- **`done` 归 `_I.READ`**；"触达前沿" ≠ `done`——内存路径靠
  `ChunkStash.$I.SEALED` 封口区分，未来文件路径靠末尾标志。
- 降级读法：**不覆写 `$I.READ`、不走 super**，直接实现
  `AbstractChunkReader._I.READ`：`await I.INITIALIZED` → 转发自家
  `_I.READ`。基类驱动对降级实例天然成立；叶子只见降级 `_I` 空间。

### 切换定位（SEEK 属降级家族）

- `CONSUMED` = fork 在共享序列的**绝对位置**（受保护）；切换时以各 fork
  `consumedChunks` 作 `REQUEST_INITIALIZE` 的 progress（播种，非累计）。
- 基类不含 `$I.SKIP` / `_I.SEEK`：定位是降级叶子 init 的职责，非通用
  驱动器。
- 降级 `_I.SEEK`（`._seek()`）：推进一个 chunk 边界、不读 body；叶子在
  `_I.INITIALIZE`（await dumping 屏障后）按 `CONSUMED` 自实现定位——
  逐界寻道或存储级 O(1) 跳转；抽象层不控制迭代。

### Transferrer（降级写侧 · 介质中性）

- `AbstractDegradedChunkReader` 纯读；写侧抽为家族内部抽象
  `AbstractTransferrer`：`dump(chunkStash)`（整块迁移，不含封存）、
  `async write(chunkStash, buffer)`（先等该 stash dumping 屏障再续写）、
  `getDumping(chunkStash)`；抽象实例 `_I.DUMP` / `_I.WRITE` 由下游实现；
  per-stash dumping 收在 Transferrer 实例（WeakMap）。
- **配对**：具体 reader 类静态成员 `transferrer` 一次性配置（守卫：
  一次性 + `instanceof AbstractTransferrer`）；转存产物（文件名/偏移等）
  经降级策略自备 WeakMap 传递，属降级策略内部细节。

### ForkedReadableStream（流面）

- `extends ReadableStream`；`$I.CHUNK_READER` 受保护 get/set 换读器契约
  口（分发器替换 reader 用）；`$I.CANCELLED` 供 `$I.PRUNE`。
- `start` 在 `super()` 内同步执行（TDZ）：用局部变量捕获 controller，
  `super()` 后桥入 `I.CONTROLLER`；`pull` / `cancel` 异步可安全用 `this`。

## 术语

- seek = 寻道（光驱磁头找道，游标跨边界）；seed = 播种（给 `CONSUMED`
  初值）——不同词，不混用。
- 内存→磁盘阶段切换称"降级（degraded）"（原 Fallback 术语已弃）。

## 决策日志（演进 · 按时间追加）

> 不稳定、演进中的决策先在此按时间（`### YYYY-MM-DD`）追加，保留
> 来龙去脉；一旦收敛为确定结论，不定期执行"结论压缩"——并入上方
> 对应主题的"当前有效结论"，并从本节移除。

### 2026-09-09 — 定位与生命周期收敛（已压缩入上方，留作示例）

- 演进弧：`START_INITIALIZE` + once-guard → 构造器播种 `progress` →
  `REQUEST_INITIALIZE(progress)` 播种、删 guard → 初始化/关闭迁降级
  家族、基类收缩为"有位置的读头"。
- SEEK：基类 `_I.SEEK`（配 `$I.SKIP`）→ 迁降级家族为寻道原语，叶子
  自实现按位定位；`CONSUMED` 承载 fork 绝对位置。
- 现结论见上方：ChunkReader 家族 / 初始化与关闭 / 读路径 / 切换定位。

### 2026-09-10 — 前沿语义收敛（已压缩入上方，留作演进记录）

- `$I.READ` 定位：per-fork 驱动 → 确认为"前沿消费"接触点，且是
  "推进消费 / 判定是否再进一步"的唯一作用域；`done` 归 `_I.READ`。
- 内存路径末尾标志落定：`ChunkStash` 增加保护级封口 `$I.SEALED`，把
  "触达前沿"与"真 `done`"分开（`index >= length` 且已封口才算完）。
- 待收敛：前沿信号形态、`$I.READ` 的等待方式，以及它与共享取块层
  "确保可用"的衔接。

现结论见上方：「读路径」/「消费前沿与 done」。
