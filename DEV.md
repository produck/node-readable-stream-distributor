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
  须为 string）——读器取自当前相位字段 `I.CURRENT_CHUNK_READER_CTOR`
  （初值 `BufferChunkReader`，降级换读器的同一同步块里翻成策略类，后者
  当场 `$I.REQUEST_INITIALIZE(0)` 播种）；`get stashByteLimit`（委托
  静态）；`get degraded`（代理消费代理的相位事实）；`destroy()` 为 TODO。
- 内部：`I.SOURCE_READER`（唯一 source 消费者）· `I.CHUNK_STASH`（共享
  `ChunkStash`）· `I.SOURCE_CONSUMPTION_AGENT`（消费代理）· `$I.REGISTRY`（fork 集，
  `$I.PRUNE` 清理已取消 fork）· `I.CTOR`（捕获的自身类）· 两个类值
  getter `I.DEGRADED_CHUNK_READER_CTOR` / `I.TRANSFERRER_CTOR`，以及当前
  相位字段 `I.CURRENT_CHUNK_READER_CTOR`（初值 `BufferChunkReader`，降级
  换读器时置为前者）。受保护侧另有写侧实例与其待用构造参数：`$I.TRANSFERRER` /
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
- 基类**不认识相位**：内存 → 介质这一层不写在通用读路径里——接替是内存族
  自己的事（见下）。
- 不持初始化/关闭（已迁降级家族）；构造直接收 `chunkStash`（不包对象）。

#### BufferChunkReader（内存 · 即时读）

- 只实现 `_I.READ`（按 `CONSUMED_CHUNK_COUNT` 下标读共享 stash；`done` 为
  `stash.done` 且 `index >= stash.length`）；构造即就绪——分发器无需
  请求初始化，也无需 close（无资源）。
- **交接整套归这里**（自己的符号模块 `BufferChunkReader/Symbol.mjs`）：私有
  位 `.#successor` + 受保护 `$I.HANDOVER(successor)`；抽象 Reader 的符号表
  里没有这两个（交接不是通用概念，只是内存族的事）。换读器时由分发器调
  `$I.HANDOVER(新读器)`（不直接写字段）；叶子进来先看那位，非空就把
  整笔读转发给接替者。
- **在途读自愈就落在这一眼上**：换读器只可能发生在 `ensure()` 的那趟
  拉取里（触发降级的那块），所以 `ensure()` 回来后重看一眼就够；不再
  依赖 DROP 时序。旧实例自己那一个位置照旧前进——它已不被任何 fork
  持有，推进无副作用。

#### AbstractDegradedChunkReader（降级 · 生命周期持有者）

- `I`：`INITIALIZED` / `CLOSED` / `LEAF_CHUNK_COUNT` / `ERROR` /
  `INITIALIZE` / `SYNC`；`$I`：`TRANSFERRER` / `REQUEST_INITIALIZE` / `CLOSE`；
  `_I`：`READ` / `INITIALIZE` / `CLOSE` / `SEEK`；`_S`：`TRANSFERRER_CTOR`
  （策略给出的写侧**类**）。
- `$I.TRANSFERRER` 是降级时由分发器交接的那个写侧实例（基类构造第三
  个参数）；读侧原语 `$I.WAIT_CHUNK(position)` / `$I.PEEK_CHUNK(position)`
  由它取。
- **请求初始化**：`$I.REQUEST_INITIALIZE(progress)` 同步播种位置，并把
  `I.INITIALIZED` 置为链体 `I.INITIALIZE`：等 `$I.WAIT_DUMPING()`（dumping
  落地）→ `_I.INITIALIZE` 打开介质 → `I.SYNC()` 进度同步（只能走到介质
  当时能到的地方）。失败闩进 `I.ERROR`、不 reject，由下一笔读抛出；只吃
  队列的读者也照做，代价是读器数 ≈ fd 数（共享句柄归策略自决）。

### 初始化与关闭（归降级家族）

- 播种 = `$I.REQUEST_INITIALIZE(progress)`：同步
  `CONSUMED_CHUNK_COUNT = progress`，随即在同一步里发起链体。
  曾用构造器传 `progress`、曾名 `START_INITIALIZE` + once-guard（均已废）。
- **分发器是唯一调用者**（同一 tick：构造 → 播种 → 交接）；无守卫——
  链体的每个 `await` 都在播种之后，读路径拿到的一定是就位点。
- `$I.CLOSE`：`I.CLOSED` 幂等 → await `I.INITIALIZED`（未发起链就是
  `undefined`）→ `_I.CLOSE`；`get closed` 暴露状态。内存读器不在本契约
  内（无 close）。

### 读路径

- 基类 `$I.READ` 只做四件：`await ensure(CONSUMED_CHUNK_COUNT)` → `await _I.READ()`
  → 非终态才 `CONSUMED_CHUNK_COUNT++` → 原样返回读结果；`done` 的含义不归它。
- **`done` 归叶子**：内存路径 = `stash.done && index >= stash.length`
  （存储层终态 + 自己的 backlog 闸）；文件路径 = 介质末尾标志 + 位置。
- 前沿不往下传：降级相位 `ensure()` 只保证"目标已拉取"（落点在队列或
  介质），**可读性归传输侧的门**（接受度）；内存相位拉取与 stash 同体，
  已拉取即可存取。门放行后仍取不到货，属契约违规，按断言处理。
- `CONSUMED_CHUNK_COUNT` 只在叶子交出内容时前进，因此总是"下一个要取的位置"；
  终态那次读不推进。降级定位拿它做 skip 依赖这一点。
- 降级读法：**不覆写 `$I.READ`、不走 super**，直接实现
  `AbstractChunkReader._I.READ`：过门 `$I.WAIT_CHUNK(位置)` → 队列命中
  （`$I.PEEK_CHUNK` 有值）**直接交付、不碰叶子，也不推进已跨数** → 否则
  （已落介质 / 到头）先 await `I.INITIALIZED`（链：open + 进度同步）→
  `I.SYNC()` 补差 → 转发自家 `_I.READ`，非终态把 `I.LEAF_CHUNK_COUNT`
  推进一格。基类驱动对降级实例天然成立；叶子只见降级 `_I` 空间。
- 门的语义是**接受度**：该位在介质上或在队列里就算可读，"到头"也算
  可读（叶子回终态）。它**不等整份 dump**——实测 dump 30ms 在途时新建
  fork 首读 1ms，整条 20 块的流只碰介质 1 次。

### 定位（skip 由驱动器引导）

- `CONSUMED_CHUNK_COUNT` = fork 在共享序列的**绝对位置**（受保护）；切换时以各 fork
  `consumedChunkCount` 作 `REQUEST_INITIALIZE` 的 progress（播种，非累计），
  同一步里用 `BufferChunkReader.$I.HANDOVER(新读器)` 交接在途那一笔，
  再换 `$I.CHUNK_READER`。
- **定位是家族的义务，不是叶子的**：`I.LEAF_CHUNK_COUNT` 记叶子已跨过
  多少条记录（出生 = 0，即它此刻站在第几条上）；`I.SYNC()` 拿它当起点、
  用本地 `index` 逐次唤 `_I.SEEK()` 跨边界（只碰头、不读 body），跨过几条
  就把数写回几；叶子回"没有下一条可跨"就停在原地，剩下的差值留给下一笔。
- **队列拦截正是差值的来源**：命中队列的那些位置不碰叶子，已跨数就停在
  原处，下一笔落介质前由 `I.SYNC()` 一并补上。
- **介质契约**：第 i 条记录对应共享序列第 i 位——`$I.DUMP` 交出的是整份
  stash（不裁剪，index 即绝对位置），所以叶子出生在序列第 0 位。二进制
  布局（长度前缀、对齐、要不要索引）全归策略，家族不假设。
- 位置只前进：读者逐位消费，叶子服务过的位置单调递增，故 `I.SYNC` 只需
  前扫；回退只能是契约违规。
- `_I.INITIALIZE` 里只做 open（不许在 init 里做定位，那是驱动器的事）；
  打开几个句柄、怎么解头、要不要批量跳，都归策略。

### Transferrer（降级写侧 · 介质中性）

- `AbstractDegradedChunkReader` 纯读；写侧抽为家族内部抽象
  `AbstractTransferrer`。**无阻塞调度的复杂性全在此作用域**：外部只
  挥手与转发，不再判断"何时降级 / dump 何时落地"。
- 三个驱动（受保护，只给分发器与 agent）：
  - `$I.DUMP(chunkStash)` — 交出整份 stash（不含封存）。**同步返回**：它
    把 stash 的块**扇入队首**（同一批对象，只加引用，不复制），把那一趟
    记进 `I.DUMPING` 并返回，本体在 `$I.START_DUMPING` 里——同一步里就调
    抽象 `_I.DUMP` 开工，成功即 `$I.DROP` 释放载体、清掉队首这 L 个重复
    副本并把水位一次推满；失败只闩 `I.ERROR` 并唤醒门，**不 DROP**（保留
    现场待查）。返回的 Promise 失败时以转义错误拒给，唯一消费者是分发器
    （非阻塞挂 `warn`）。
  - `$I.WRITE(buffer)` — **入队即返回**（延缓写入）：不碰介质，只追加
    待写队列并确保 drain 在途。队列**无上限**，积压处置归下游，抽象
    层只给计数。
  - `$I.SET_DONE()` — 源已尽的落点；置位并唤醒门（终值冻结会改变
    "可读"判定）。
- 串行链 `I.DRAIN` 单飞：先等 `I.DUMPING` 落地（不然会把队首那 L 个
  副本再写一遍），再按 FIFO 一块一块写队列，写一块推一格水位。于是
  "活块永远排在 dump 之后"天然成立。
- 读侧原语（受保护）：`$I.WAIT_CHUNK(position)` = 等到该位**已被接受**
  （`position < 水位 + 队列`）或**永远不会有块**（done）；终态错误以
  `I.ERROR` 拒绝。`$I.PEEK_CHUNK(position)` 给出**还在队列里**的那一块
  （越界/已落介质则 `undefined`，由叶子判）。唤醒靠 `I.PROGRESS`（每次
  前进换新 resolver），`I.ADVANCE(writtenChunkCount)` 是唯一发布点。
- **可读 = 被接受**：在介质上或在队列里都算。介质的进度只决定"从哪儿
  取"（队列 or 叶子），不决定"能不能取"。
- 公开只读：`get pendingChunkCount` / `get pendingByteLength`（积压规模，
  只作观察量纲：本设计**不给积压设上限、不做闸门**，介质挂住时尽力
  而为）/ `get writtenChunkCount`（水位）/ `get done` / `get error`
  （终态闩）。**不再有 `get dumping`**：时序不外泄——可读性归位置门，
  写入排序归本实例自己。（宿主目前拿不到这几个数字：transferrer 由
  分发器私有持有，宿主侧的观察面仍是待定项。）
- 实例与 `ChunkStash` 1:1，因此状态就是普通字段，不再用 WeakMap /
  WeakSet 按 stash 键控。抽象钩子 `_I.DUMP` / `_I.WRITE` 由下游实现。
- 完成标志 `$I.SET_DONE()` / `get done` 与 stash 侧 `$I.SET_DONE()` /
  `done` 同形（连分层也一致），但落点换人：降级相位的落点交接记在
  transferrer 上（源已尽那一趟拉取由 agent 同步置位）。它不只置位——
  还唤醒门："该位永不会有块"正是由它冻结的终值算出来的。
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

### 2026-09-16 — 积压只观察、不设限

- 结论：积压（`PENDING_CHUNKS`）**不设上限、不做背压闸门**。介质挂住
  （NFS 断网这类）期间读侧继续由队列交付，能跑就跑；撑多久由宿主的
  内存容量与分发器生命周期决定。
- 与"失败是业务宕机"的分工：写**挂住**不闩错、继续积压；写**报错**
  才闩 `I.ERROR`，之后所有读拒绝。
- 只保留观察：`get pendingChunkCount` / `get pendingByteLength` 是观察
  量纲；宿主侧的观察面（分发器是否暴露、要不要发事件）尚未设计。
- 据此作废 `SourceConsumptionAgent.ensure` 里"缓冲满了就暂停拉取"的
  背压 TODO，改挂观察 TODO。
