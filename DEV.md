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
  （`.$consumedChunkCount`）；描述符：实例 `.#*` / `.$*` / `._*`，静态 `S.*`。
- `index.mjs` 只导出受保护/抽象空间（`$I`/`$S`/`_I`/`_S`），**严格不导出
  私有 `I`/`S`**。
- 模块路径即命名空间——跨模块同词不冲突（降级 `_I.READ` 与基类 `_I.READ`
  各自独立）；符号表的键数不设上限。
- 面向调用者的具名成员（getter、`chunkStash`）用普通字符串键。
- 缩写白名单：构造器（`new.target` 捕获）→ `CTOR`。**符号键持有类值一律
  以 `_CTOR` 结尾**（`_S.DEGRADED_CHUNK_READER_CTOR` /
  `_S.TRANSFERRER_CTOR`）。组织级共享符号集（待建）收编这类通用含义的
  键，避免每个模块重复声明。

### Static + instance 委托

- 公开静态 getter 委托 `_S` 抽象；实例经构造时捕获的 `I.CTOR`
  （`new.target`）委托静态侧（不用 `this.constructor`）。
- `stashByteLimit` 默认 `os.freemem()`；`Parser.mjs` 提供 `.returns`
  解析器（如 `NonNegativeInteger`）。
- `_S.DEGRADED_CHUNK_READER_CTOR`：策略侧给出的降级读取器类引用，
  degrade 时用它构造各 fork 的新读取器；暂以 `M.Function` 弱校（只确认
  是函数），待收敛为“必须是降级家族的子类”。

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
  须为 string）；`get stashByteLimit`（委托静态）；`get degraded`
  （代理消费代理的相位事实）；`destroy()` 为 TODO。
- 内部：`I.SOURCE_READER`（唯一 source 消费者）· `I.CHUNK_STASH`（共享
  `ChunkStash`）· `I.SOURCE_CONSUMPTION_AGENT`（消费代理）· `$I.REGISTRY`（fork 集，
  `$I.PRUNE` 清理已取消 fork）· `I.CTOR`（捕获的自身类）与
  `I.DEGRADED_CHUNK_READER_CTOR` / `I.TRANSFERRER_CTOR`（两级类值
  getter）。受保护侧另有写侧实例与其待用构造参数：`$I.TRANSFERRER` /
  `$I.SET_TRANSFERRER_ARGS(...)`（落 `I.TRANSFERRER_ARGS`，分发器只存转、
  不解释）。构造校验 source 为未锁定的 WHATWG ReadableStream。
- 共享 stash 由分发器 create/持有并注入各读取器；内容生命周期（push /
  `$I.SEAL()` / `$I.SET_DONE()`）归 `SourceConsumptionAgent`，dump→drop
  归分发器。
- 降级：**触发在消费代理**（stash 字节超过 `stashByteLimit`），**执行在分发器** `$I.DEGRADE`——
  构造写侧实例（按读器家族 `_S.TRANSFERRER_CTOR` + 预置构造参数）、
  执行其 `dump`、遍历 registry、选降级 reader 类、换掉各 fork 的读取器
  都留在结构侧。

### SourceReader（分发器侧拉取装置）

- **源的所有权**：构造时即 `getReader()` 锁死——给了分发器的源即被独占
  整个生命周期。永不 `releaseLock()`，且这不是纪律而是结构事实：reader
  只存在于私有 `I.READER`，外部无处取得释放机会；`stream.cancel()` 也被
  锁挡死（锁定即拒，且不尝试取消）。前提：一个源只喂一个分发器、一个
  分发器一生只用一个 reader。对外可见的外观是 `stream.locked` 恒为 true。
- 三个事实位互斥穷尽：`done`（源到头，拉取触发）· `error`（源出错，
  拉取触发）· `cancelled`（我们下过收摊令，同步置位）。三格：
  `(done, error, cancelled)` = `(true, null, false)` 走完 ·
  `(false, cause, false)` 源错 · `(false, null, true)` 我们收摊。
- `cancel(reason)`：幂等（已置位即返回）；**先置位再转交**平台
  `reader.cancel(reason)`；上游 cancel 回调失败时异常原样抛给调用者
  （规范保证流仍关闭）。**不释放锁**：它只表示我们不要这个源了，
  不表示把流还回去。
- **收摊后的平台回声不采信**：`cancelled` 为真时 `read()` 既不写 `done`
  也不写 `error`——否则平台对收摊令的回答会被当成源到头，收摊后
  `read()` 的 TypeError 会冒充源错误。
- 待收敛：第二次 `cancel()` 不等第一次 settle（要存 promise 闩锁，需先
  腾键位）；`I.STREAM` 是死字段（构造写入、无人读），可删。

### ChunkStash（共享内存暂存）

- 公开只读：`dropped` / `sealed` / `done` / `length` / `byteLength`；
  `get(index)` 带封存守卫；`chunks()` 返回有序快照迭代器。
- 写面受保护：`$I.PUSH(chunk)` / `$I.SEAL()` / `$I.SET_DONE()` / `$I.DROP()`
  只在包内使用——公开它们会泄漏"封存共享内存"的能力（Transferrer
  只管转存，不封存）。
- 两个终态各管一件事：`sealed` = 整份 dump 前的写面冻结（**与源已尽
  无关**）；`done` = 这一层存储自己的内容终态（由落点交接而来）。二者是
  私有 `I` 成员，只经上面四个动作与 `get sealed` / `get done` 进出。

### Reader 术语

- `ChunkReader` = 各拷贝的逐块读取装置；`source reader` = 分发器侧拉取
  装置。职责不同，代码与文档不共用 `READER`。

### ChunkReader 家族

- 分叉：内存路径 `BufferChunkReader`（直接读共享 `ChunkStash`）与降级
  家族（`AbstractDegradedChunkReader` + 具体叶子）。

#### 基类 AbstractChunkReader = "有位置的读头"

- `$I`：`CONSUMED_CHUNK_COUNT` / `CHUNK_STASH` / `READ`；`_I`：`READ`；公开只读
  `chunkStash` / `consumedChunkCount`。
- `$I.READ`：`await ensure(CONSUMED_CHUNK_COUNT)` → `_I.READ()` → 叶子报非终态才
  `CONSUMED_CHUNK_COUNT++` → 原样返回读结果；`done` 的含义不在这里（见「读路径」）。
- 不持初始化/关闭（已迁降级家族）；构造直接收 `chunkStash`（不包对象）。

#### BufferChunkReader（内存 · 即时读）

- 只实现 `_I.READ`（按 `CONSUMED_CHUNK_COUNT` 下标读共享 stash；`done` 为
  `stash.done` 且 `index >= stash.length`）；构造即就绪——分发器无需
  请求初始化，也无需 close（无资源）。

#### AbstractDegradedChunkReader（降级 · 生命周期持有者）

- `I`：`INITIALIZED` / `CLOSED`；`$I`：`TRANSFERRER` / `REQUEST_INITIALIZE`
  / `CLOSE`；`_I`：`READ` / `INITIALIZE` / `CLOSE` / `SEEK`；`_S`：
  `TRANSFERRER_CTOR`（策略给出的写侧**类**）。
- `$I.TRANSFERRER` 是降级时由分发器交接的那个写侧实例（基类构造第三
  个参数），屏障 `chunkStashDumping` 由它取。
- 初始化经 `I.INITIALIZED`（`_I.INITIALIZE` 返回的 Promise）承接；
  `_I.INITIALIZE` 默认实现 = dumping 屏障（`chunkStashDumping`）；叶子要
  open + 定位则覆写它。

### 初始化与关闭（归降级家族）

- 播种 = **请求初始化** `$I.REQUEST_INITIALIZE(progress)`：同步
  `CONSUMED_CHUNK_COUNT = progress` 后发起 `_I.INITIALIZE`（就绪由 `I.INITIALIZED`
  承接）。曾用构造器传 `progress`、曾名 `START_INITIALIZE` + once-guard
  （均已废）。
- **分发器是唯一调用者**（同一 tick：构造 → 请求初始化）；无守卫，
  初始化完全受分发器控制。
- `$I.CLOSE`：`I.CLOSED` 幂等 → await `I.INITIALIZED` → `_I.CLOSE`；
  `get closed` 暴露状态。内存读器不在本契约内（无 close）。

### 读路径

- 基类 `$I.READ` 只做四件：`await ensure(CONSUMED_CHUNK_COUNT)` → `await _I.READ()`
  → 非终态才 `CONSUMED_CHUNK_COUNT++` → 原样返回读结果；`done` 的含义不归它。
- **`done` 归叶子**：内存路径 = `stash.done && index >= stash.length`
  （存储层终态 + 自己的 backlog 闸）；文件路径 = 介质末尾标志 + 位置。
- 前沿不往下传：`ensure()` 的契约是"返回时目标已可读，或存储层已终结"
  （见 agent），所以叶子遇到"取不到货"属契约违规，实现侧按断言处理。
- `CONSUMED_CHUNK_COUNT` 只在叶子交出内容时前进，因此总是"下一个要取的位置"；
  终态那次读不推进。降级定位拿它做 skip 依赖这一点。
- 降级读法：**不覆写 `$I.READ`、不走 super**，直接实现
  `AbstractChunkReader._I.READ`：`await I.INITIALIZED` → 转发自家
  `_I.READ`。基类驱动对降级实例天然成立；叶子只见降级 `_I` 空间。

### 切换定位（SEEK 属降级家族）

- `CONSUMED_CHUNK_COUNT` = fork 在共享序列的**绝对位置**（受保护）；切换时以各 fork
  `consumedChunkCount` 作 `REQUEST_INITIALIZE` 的 progress（播种，非累计）。
- 基类不含 `$I.SKIP` / `_I.SEEK`：定位是降级叶子 init 的职责，非通用
  驱动器。
- 降级 `_I.SEEK`（`._seek()`）：推进一个 chunk 边界、不读 body；叶子在
  `_I.INITIALIZE`（await dumping 屏障后）按 `CONSUMED_CHUNK_COUNT` 自实现定位——
  逐界寻道或存储级 O(1) 跳转；抽象层不控制迭代。

### Transferrer（降级写侧 · 介质中性）

- `AbstractDegradedChunkReader` 纯读；写侧抽为家族内部抽象
  `AbstractTransferrer`：受保护 `$I.DUMP(chunkStash)`（整块迁移，不含
  封存）/ `$I.WRITE(buffer)`（先等本实例的 dumping 屏障再续写）/
  `$I.SET_DONE()` 三个驱动只给分发器与 agent；读侧公开 `get dumping` /
  `get done`。抽象实例 `_I.DUMP(chunkStash)` / `_I.WRITE(buffer)` 由下游
  实现。
- 实例与 `ChunkStash` 1:1，因此状态就是普通字段（`dumping` / `done`），
  不再用 WeakMap / WeakSet 按 stash 键控。
- 完成标志 `$I.SET_DONE()` / `get done` 与 stash 侧 `$I.SET_DONE()` /
  `done` 同形（连分层也一致），但落点换人：降级相位的落点交接记在
  transferrer 上（源已尽那一趟拉取由 agent 同步置位，无屏障——拉取串行
  等待 `write`，到位时"此前每块已可读"已成立）。降级叶子据此判终态。
- **配对**：写侧**类**由降级读器家族声明（`_S.TRANSFERRER_CTOR`，
  基类静态抽象）；分发器在降级时取它构造实例并持有（`$I.TRANSFERRER`），
  再交接给各拷贝的新读取器。实例与 `ChunkStash` 1:1，因此不再需要
  一次性守卫与 `instanceof` 校验。转存产物可留在实例自己的字段里。

### ForkedReadableStream（流面）

- `extends ReadableStream`；`get $I.CHUNK_READER` 读当前读器，
  `$I.SET_DEGRADED_CHUNK_READER(reader)` 是唯一的换入口（降级时用，只此
  一次）；`$I.CANCELLED` 供 `$I.PRUNE`。
- `start` 在 `super()` 内同步执行（TDZ）：用局部变量捕获 controller，
  `super()` 后桥入 `I.CONTROLLER`；`pull` / `cancel` 异步可安全用 `this`。

## 术语

- seek = 寻道（光驱磁头找道，游标跨边界）；seed = 播种（给 `CONSUMED_CHUNK_COUNT`
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
  自实现按位定位；`CONSUMED_CHUNK_COUNT` 承载 fork 绝对位置。
- 现结论见上方：ChunkReader 家族 / 初始化与关闭 / 读路径 / 切换定位。

### 2026-09-10 — 前沿语义收敛（已压缩入上方，留作演进记录）

- `$I.READ` 定位：per-fork 驱动 → 确认为"前沿消费"接触点，且是
  "推进消费 / 判定是否再进一步"的唯一作用域；`done` 归 `_I.READ`。
- 内存路径末尾标志落定：`ChunkStash` 增加保护级封口 `$I.SEALED`，把
  "触达前沿"与"真 `done`"分开（`index >= length` 且已封口才算完）。
- 09-13 修订：封口改归"整份 dump 前的冻结"，真 `done` 改由 `stash.done`
  与自身位置判定，前沿改由 `ensure()` 的就绪契约吸收；下列"待收敛"两项
  由此收口。
- 待收敛（当时）：前沿信号形态、`$I.READ` 的等待方式，以及它与共享
  取块层"确保可用"的衔接。

现结论见上方：「读路径」/「消费前沿与 done」。
