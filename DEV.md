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
- 面向调用者的具名成员（如 `get dumping` / `get done`）用普通字符串键。
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
- 介质侧实现极端简化可用单文件特例（如 `Distributor/BufferChunkReader.mjs`）。

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
  家族（`AbstractDegradedChunkReader` + 具体介质侧实现）。

#### 基类 AbstractChunkReader = "有位置的读头"

- `$I`：`CONSUMED_CHUNK_COUNT` / `CHUNK_STASH` / `READ` /
  `ENSURE_THEN_READ`；`_I`：`READ`；无字符串键成员（位置与 stash 全走 `$I`）。
- `$I.READ`（单纯读）：`_I.READ()` → 介质侧报非终态才
  `CONSUMED_CHUNK_COUNT++` → 原样返回读结果；`done` 的含义不在这里
  （见「读路径」）。
- `$I.ENSURE_THEN_READ`（驱动入口）：`await ensure(CONSUMED_CHUNK_COUNT)` →
  `$I.READ()`；分发流的 `pull` 走这条。
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
  `$I.HANDOVER(新读器)`（不直接写字段）；介质侧进来先看那位，非空就把
  整笔读转发给接替者——转发走接替者的**单纯读** `$I.READ`（这一笔的
  ensure 已由转发者做过），不再重复。
- **在途读自愈就落在这一眼上**：换读器只可能发生在 `ensure()` 的那趟
  拉取里（触发降级的那块），所以 `ensure()` 回来后重看一眼就够；不再
  依赖 DROP 时序。旧实例自己那一个位置照旧前进——它已不被任何 fork
  持有，推进无副作用。

#### AbstractDegradedChunkReader（降级 · 生命周期持有者）

- `I`：`INITIALIZED` / `CLOSED` / `SEEKED_CHUNK_COUNT` / `ERROR` /
  `INITIALIZE` / `SYNC` / `READ_BACK`；`$I`：`TRANSFERRER` / `REQUEST_INITIALIZE` / `CLOSE`；
  `_I`：`READ` / `INITIALIZE` / `CLOSE` / `SEEK`；`_S`：`TRANSFERRER_CTOR`
  （策略给出的写侧**类**）。
- **下游便利面**：`get chunkStash`（共享 stash，`_I.DUMP(chunkStash)` 的
  入参就是它）与 `get closed`。除此之外不开口——位置是家族的记账，
  策略只见"跨一条边界"。
- `$I.TRANSFERRER` 是降级时由分发器交接的那个写侧实例（基类构造第三
  个参数）；读侧原语 `$I.WAIT_CHUNK(position)` / `$I.PEEK(position)`
  由它取。
- **请求初始化**：`$I.REQUEST_INITIALIZE(progress)` 同步播种位置，并把
  `I.INITIALIZED` 置为链体 `I.INITIALIZE`：等 `get dumping`（整份转移
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

- 基类 `$I.READ` 就是取一笔：`await _I.READ()` 后非终态才
  `CONSUMED_CHUNK_COUNT++`，原样返回读结果；带 ensure 的驱动入口是
  `$I.ENSURE_THEN_READ`（它只是在这句前面加一次 `await ensure(...)`），
  也是 `pull` 调的那个；`done` 的含义不归它。
- **`done` 归介质侧**：内存路径 = `stash.done && index >= stash.length`
  （存储层终态 + 自己的 backlog 闸）；文件路径 = 介质末尾标志 + 位置。
- 前沿不往下传：降级相位 `ensure()` 只保证"目标已拉取"（落点在队列或
  介质），**可读性归传输侧的门**（接受度）；内存相位拉取与 stash 同体，
  已拉取即可存取。门放行后仍取不到货，属契约违规，按断言处理。
- `CONSUMED_CHUNK_COUNT` 只在介质侧交出内容时前进，因此总是"下一个要取的位置"；
  终态那次读不推进。降级定位拿它做 skip 依赖这一点。
- 降级读法：**不覆写 `$I.READ` / `$I.ENSURE_THEN_READ`、不走 super**，直接实现
  `AbstractChunkReader._I.READ`：过门 `$I.WAIT_CHUNK(位置)` → 队列命中
  （`$I.PEEK` 有值）**直接交付、不碰介质侧，也不推进已跨数** → 否则
  （已落介质 / 到头）走 `I.READ_BACK()` **读回**：先 await 就位点
  `I.INITIALIZED`（链：open + 进度同步）→ `I.SYNC()` 补差 → 转发自家
  `_I.READ`，非终态把 `I.SEEKED_CHUNK_COUNT` 推进一格。基类驱动对降级实例
  天然成立；介质侧只见降级 `_I` 空间。
- 门的语义是**接受度**：该位在介质上或在队列里就算可读，"到头"也算
  可读（介质侧回终态）。它**不等整份 dump**——实测 dump 30ms 在途时新建
  fork 首读 1ms，整条 20 块的流只碰介质 1 次。

### 定位（skip 由驱动器引导）

- `CONSUMED_CHUNK_COUNT` = fork 在共享序列的**绝对位置**（受保护）；切换时以
  各 fork 的 `$I.CONSUMED_CHUNK_COUNT` 作 `REQUEST_INITIALIZE` 的 progress
  （播种，非累计），同一步里用 `BufferChunkReader.$I.HANDOVER(新读器)` 交接
  在途那一笔，再换 `$I.CHUNK_READER`。
- **定位是家族的义务，不是介质侧的**：`I.SEEKED_CHUNK_COUNT` 记游标已
  寻道跨过多少条记录（出生 = 0，即它此刻站在第几条上；`_I.SEEK` 跨边界
  与 `_I.READ` 交付各算一次——`_I.READ` 视为"寻道 + 取货"）；`I.SYNC()`
  拿它当起点、用本地 `index` 逐次唤 `_I.SEEK()` 跨边界（只碰头、不读
  body），跨过几条就把数写回几；介质侧回"没有下一条可跨"就停在原地，
  剩下的差值留给下一笔。
  定位只为读回服务：`_I.SEEK` 跨边界不取货，读回才取。
- **队列拦截正是差值的来源**：命中队列的那些位置不碰介质侧，已跨数就停在
  原处，下一笔落介质前由 `I.SYNC()` 一并补上。
- **介质契约**：第 i 条记录对应共享序列第 i 位——`$I.DUMP` 交出的是整份
  stash（不裁剪，index 即绝对位置），所以介质侧实现出生在序列第 0 位。二进制
  布局（长度前缀、对齐、要不要索引）全归策略，家族不假设。
- 位置只前进：读者逐位消费，介质侧服务过的位置单调递增，故 `I.SYNC` 只需
  前扫；回退只能是契约违规。
- `_I.INITIALIZE` 里只做 open（不许在 init 里做定位，那是驱动器的事）；
  打开几个句柄、怎么解头、要不要批量跳，都归策略。

### Transferrer（降级写侧 · 介质中性）

- `AbstractDegradedChunkReader` 纯读；写侧抽为家族内部抽象
  `AbstractTransferrer`。**无阻塞调度的复杂性全在此作用域**：外部只
  挥手与转发，不再判断"何时降级 / dump 何时落地"。
- 三个驱动（受保护，只给分发器与 agent）：
  - `$I.DUMP(chunkStash)` — 交出整份 stash（不含封存）。**同步返回**：它
    **接管** stash 的整份块列表（同一批对象，只加引用，不复制）——此刻
    队列必空，因为 `$I.DUMP` 是队列的第一个写入者（transferrer 刚在
    `$I.DEGRADE` 里构造出来就挥手），这条是接管式写法的前提。把那一趟
    记进 `I.DUMPING` 并返回，本体在 `I.START_DUMPING` 里——同一步里就调
    抽象 `_I.DUMP` 开工，成功即 `$I.DROP` 释放载体、清掉接管的这 L 条
    （已落盘）并把水位一次推满；失败只闩 `I.ERROR` 并结算门，**不 DROP**
    （保留现场待查）。返回的 Promise 失败时以转义错误拒给，唯一消费者是
    分发器（非阻塞挂 `warn`）。
  - `$I.WRITE(buffer)` — **入队即返回**（延缓写入）：不碰介质，只追加
    待写队列并确保 drain 在途。队列**无上限**，积压处置归下游；计数不
    外露（调试看符号表）。
  - `$I.SET_DONE()` — 源已尽的落点；置位并结算门（终值冻结会改变
    "可读"判定）。
- 串行链 `I.DRAIN` 单飞：先等 `I.DUMPING` 落地（不然会把接管的这 L 条
  再写一遍），再按 FIFO 一块一块写队列，写一块推一格水位。于是
  "活块永远排在 dump 之后"天然成立。
- 读侧原语（受保护）：`$I.WAIT_CHUNK(position)` = 等到该位**已被接受**
  （`position < 水位 + 队列`）或**永远不会有块**（done）；终态错误以
  `I.ERROR` 拒绝。`$I.PEEK(position)` 给出**还在队列里**的那一块
  （越界/已落介质则 `undefined`，由介质侧判）。等待靠登记表：
  `I.PENDING_RELEASES` = `Map<resolve, position>`——键是这一位的放行指令，
  值是它等的位。
  `$I.WAIT_CHUNK` 登记后立刻结算一次；改变可读判定的四处（入队、dump
  落地、`SET_DONE`、`FAIL`）各调一次 `I.SETTLE()`，由它按
  `position < 水位 + 队列` 或 `DONE` / `ERROR` 放行够号的——没有广播，
  也没有各自重判。drain 落盘**不**结算：对 `total = 水位 + 队列`
  恒定，放行不了任何人；门收不到介质进度，也就不可能让它参与可读性。
- **可读 = 被接受**：在介质上或在队列里都算。介质的进度只决定"从哪儿
  取"（队列 or 介质侧），不决定"能不能取"。
- **纯内部对象**：实例由分发器私有持有，**不开观察面**——要看就进
  调试器按符号表读成员（`I.PENDING_CHUNKS` / `I.WRITTEN_CHUNK_COUNT` /
  `I.PENDING_RELEASES` / `I.DRAINING` / `I.DONE` / `I.ERROR` /
  `I.DUMPING`）。对家族只留一个读入口：`get dumping`
  （初始化链等的就是它落地），其余交互全走 `$I` 原语。
- 实例与 `ChunkStash` 1:1，因此状态就是普通字段，不再用 WeakMap /
  WeakSet 按 stash 键控。抽象钩子 `_I.DUMP` / `_I.WRITE` 由下游实现。
- 完成标志 `$I.SET_DONE()` / `get done` 与 stash 侧 `$I.SET_DONE()` /
  `done` 同形（连分层也一致），但落点换人：降级相位的落点交接记在
  transferrer 上（源已尽那一趟拉取由 agent 同步置位）。它不只置位——
  还结算门："该位永不会有块"正是由它冻结的终值算出来的。
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
- 读回（read back）= 降级 reader 从**真实介质**里取块的行为（家族侧
  `I.READ_BACK()`）：`_I.READ` 交出介质侧游标上那一条。从队列交付的那几笔
  不算读回（没碰介质）；定位（`_I.SEEK` 跨边界）也不取货，它是读回前的
  归位。这个名字对着 write-back：入队即返回是回写，没命中缓冲时就把块
  **读回**来。
- 内存→磁盘阶段切换称"降级（degraded）"（原 Fallback 术语已弃）。

## 决策日志（演进 · 按时间追加）

> 不稳定、演进中的决策先在此按时间（`### YYYY-MM-DD`）追加，保留
> 来龙去脉；一旦收敛为确定结论，不定期执行"结论压缩"——并入上方
> 对应主题的"当前有效结论"，并从本节移除。

### 2026-09-09 — 定位与生命周期收敛（已压缩入上方，留作示例）

- 演进弧：`START_INITIALIZE` + once-guard → 构造器播种 `progress` →
  `REQUEST_INITIALIZE(progress)` 播种、删 guard → 初始化/关闭迁降级
  家族、基类收缩为"有位置的读头"。
- SEEK：基类 `_I.SEEK`（配 `$I.SKIP`）→ 迁降级家族为寻道原语，介质侧
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
- 观察不外露：transferrer 是纯内部对象（调试看符号即可），所以只写
  不读的计数（积压字节数）以及 `get pendingChunkCount` /
  `get writtenChunkCount` 一并撤掉；积压本身不设上限、不做闸门。
- 据此作废 `SourceConsumptionAgent.ensure` 里"缓冲满了就暂停拉取"的
  背压 TODO，改挂观察 TODO。

### 2026-09-17 — 位置门：广播改为等待者登记表

- 现象：原实现是"广播 + 各自重判"——`I.PROGRESS` 存一代 resolver，
  `I.ADVANCE(writtenChunkCount)` 换新代并 resolve 旧代；等待者在
  `while` 里反复重算 `position < 水位 + 队列`。两处别扭：`I.FAIL` 与
  `$I.SET_DONE` 得"把原数传回去假装前进"才能发布；drain 每写一块发一次
  广播，而"队列 -1、水位 +1"对 `total` 恒定，那次唤醒对等待者不可观测
  （空唤醒）。真正改变 `total` 的入队处反倒不发信号，靠 drain 顺手那发
  兜住。
- 结论：改为等待者登记表（`I.PENDING_RELEASES`，`Map<放行指令, 位置>`）
  加结算（`I.SETTLE`）：判据只写在 `I.SETTLE` 一处（`position < 水位 + 队列`，
  或 `DONE` / `ERROR`），够号的当场放行并出表；`$I.WAIT_CHUNK` 只做
  "登记 → 结算 → 等"，错误在末尾复查一次抛出。
- 义务：改变可读判定的地方都必须调 `I.SETTLE()`——入队、dump 落地、
  `$I.SET_DONE`、`I.FAIL` 共四处。漏一处即静默挂死。drain 落盘**不**
  结算：它对 `total = 水位 + 队列` 恒定（队列 -1、水位 +1），放行不了
  任何人；不通知门也结构性保证"介质进度不决定可读性"（此前那处是
  O(等待者数) 的空扫，分发流越多越白扫）。
- 作废：`I.PROGRESS` / `I.ADVANCE`；`while` 重判与"唯一发布点"的说法。
- 终局不单列分支：放行写成单循环 `position < 水位 + 队列 || isTerminal`，
  一处 `delete` + `resolve`。试过把终局提成前置分支（整表 `resolve` +
  `clear()` 后返回）：逻辑等价、交错 A/B 测不出收益（四样本 3130 / 3137
  ns/笔读），但同屏两个 `for...of` 让「放行点只有一处」不再一眼可见，故回退。
- 登记表容器取 `Map<放行指令, 位置>`（键是 `resolve`，故 `$I.WAIT_CHUNK`
  能就地 `set(resolve, position)`）：不是为了省那个字面量——交错 A/B 实测
  Map 两种取位写法与 Set 版都无差异——而是让容器自己说明键值分工。
- 空表早返回：`I.SETTLE` 首行见 `I.PENDING_RELEASES` 为空即返回——写侧
  每块两次结算（入队、落盘）在"无人在等"时不扫表；无人在等时本就无人
  可放行，是纯收益，且只有"读器贴着前沿"时才不触发。
- 实测（`logs/probe-wait-cost.mjs`，1e6 次 / 1e5 笔）：命中路径过门
  445–483ns 对"命中即返回"153–155ns（整条读路径 ~3.0µs → ~2.6µs，约
  −15%）；promise 构造本身只占 ~20ns（地板 ~30ns 对"建 promise 再
  await" ~58ns）。读路径本身 ~3µs/块 ≈ 22GB/s（64KB 块），远快于任何
  现实消费者，故**不**改命中即返回：它要让判据落两处、并把 `I.ERROR`
  检查提到命中路径，为 15% 换掉"判据只写一处"，不划算。
- 实测（`logs/probe-gate.mjs`）：入队即放行；按号放行（号 2 要等第三块）；
  dump 在途不放行、落地即放行；`SET_DONE` 放行"永不会有块"的等待者；
  `FAIL` 以原因拒绝等待者与后来者。三个既有探针输出不变。
