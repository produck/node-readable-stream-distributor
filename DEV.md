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

### 受保护实例字段与静态钩子（`_S`）

- 分发器没有公开静态面：策略只经 `_S` 静态钩子声明类值（现只剩
  `_S.DEGRADED_CHUNK_READER_CTOR`），消费者是构造时捕获的 `I.CTOR`
  （`new.target`），不用 `this.constructor`。
- 内存→介质阈值：构造参数 `stashByteLimit`（默认 `1024 ** 3`，即 1GiB），
  构造时经 `NonNegativeInteger` 校验后落进受保护字段
  `$I.STASH_BYTE_LIMIT`；唯一写入点就是构造器，此后只读。降级触发点
  因此确定可复现。
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
  当场 `$I.REQUEST_INITIALIZE(0)` 播种）；`get degraded`（代理消费代理的
  相位事实）；`get terminated`（`$I.TERMINATION` 是否已落）；
  `terminate()`（只关闸门，幂等）；`destroy()`（关闸门 + 封口 + 切断源）。
- 内部：`I.SOURCE_READER`（唯一 source 消费者）· `I.CHUNK_STASH`（共享
  `ChunkStash`）· `$I.STASH_BYTE_LIMIT`（阈值，构造器唯一写入）·
  `I.SOURCE_CONSUMPTION_AGENT`（消费代理）·
  `$I.FORKED_READABLE_STREAM_REGISTRY`
  （fork 注册表，fork 出口自清理也要读）· `$I.TERMINATION`（未终结为
  `null`，否则是终止原因；只剩 `fork()` 闸门与 `destroy()` 的取消读它）·
  `I.CTOR`
  （捕获的自身类）· 两个类值
  getter `I.DEGRADED_CHUNK_READER_CTOR` / `I.TRANSFERRER_CTOR`，以及当前
  相位字段 `I.CURRENT_CHUNK_READER_CTOR`（初值 `BufferChunkReader`，降级
  换读器时置为前者）。受保护侧另有写侧实例与其待用构造参数：`$I.TRANSFERRER` /
  `$I.SET_TRANSFERRER_ARGS(...)`（落 `I.TRANSFERRER_ARGS`，分发器只存转、
  不解释）。构造校验 source 为未锁定的 WHATWG ReadableStream。
- 共享 stash 由分发器 create/持有并注入各读取器；内容生命周期（push /
  `$I.SEAL()` / `$I.SET_DONE()`）归 `SourceConsumptionAgent`，dump→drop
  归分发器。
- 降级：**触发在消费代理**（stash 字节超过构造时定下的阈值），**执行在分发器** `$I.DEGRADE`——
  构造写侧实例（按读器家族 `_S.TRANSFERRER_CTOR` + 预置构造参数）、
  执行其 `dump`、遍历 registry、选降级 reader 类、换掉各 fork 的读取器
  都留在结构侧。
- **`terminate()` 的契约**：幂等（已终结即返回）；终止原因落
  `$I.TERMINATION`（`DOMException`，`name` 为 `AbortError`）；派
  `terminate` 事件。**它只关闸门**：此后 `fork()` 抛错，除此外什么都不动——
  不封口、不取消源、不碰任何已建 fork。已建 fork 照常运行：需要数据就
  继续向源拉取，直到源自己到头（`close()`）。消费代理的 `ensure()` /
  `pull()` 都不认识这个状态（判据是“源还能用吗”与“落点封口了吗”）。
- **两个动作的语义分层**：`terminate()` = 只关**闸门**（拒新 fork）；
  `destroy()` = 闸门 + **封口**（前沿定长）+ **切断源**，已建拷贝各自读到
  前沿自然收尾（`close()`，不突袭）。命名与状态同名（`terminate` /
  `$I.TERMINATION` / `get terminated`），把“谁关闸门、谁封口”写在名字上。
- **`destroy()` 骨架**：`terminate()` → 按相位封口（`$I.TRANSFERRER` 为
  `null` 就是 stash `$I.SET_DONE`，否则是 transferrer `$I.SET_DONE`）
  → `SOURCE_READER.cancel(终止原因)`（不 await；失败只派
  `warn('source-cancel-failed')`）。它自己**不持状态**：三步各自幂等
  （`terminate` 有守卫、封口是置位、cancel 有守卫），所以二次 `destroy()`
  天然无害，也就不需要第二个“已摧毁”标志。**不** abort 拷贝、**不**清表、
  **不** `$I.DROP()`：封口之后前沿已定，未读的拷贝还要接着读那段缓冲，
  清表/释放都会把它们打断。未做：引用计数——最后一个拷贝结束才释放
  stash 与介质（写侧还没有关闭口）。

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
  对“源还能不能拉”这一个问题，对外只给一个读口：`finished`
  （`done || cancelled`）——消费代理的 `ensure()` 只认它。
- `cancel(reason)`：幂等（已置位即返回）；**先置位再转交**平台
  `reader.cancel(reason)`；上游 cancel 回调失败时异常原样抛给调用者
  （规范保证流仍关闭）。**不释放锁**：它只表示我们不要这个源了，
  不表示把流还回去。
- **收摊后的平台回声不采信**：`cancelled` 为真时 `read()` 直接答
  `{done: true}`（既不写 `done` 也不写 `error`），也不再去碰平台那个
  已释放的 reader——否则收摊后 `read()` 的 TypeError 会冒充源错误。
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
- **终止后不再拉取**：`ensure()` 的循环与收尾都认
  分发器的 `$I.TERMINATION`（软档不取消源，所以不能拿
  `sourceReader.cancelled` 当判据）；另外 `pull()` 在读到数据后会复查一次
  终止状态，**把在途那一笔作废**——不取消源就意味着那一笔会带着真实数据
  回来，不然前沿会被它推迟一格，前缀长度变成时序依赖。
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
  一次）；`$I.CANCELLED` 供 `pull` 早退与 `cancel` 幂等。
- **两个出口自己出表**：注册表不在自己身上，出口时经
  `I.DISTRIBUTOR` + 分发器的受保护符号
  `$I.FORKED_READABLE_STREAM_REGISTRY` 取到；读到尾
  （`pull` 收到 `done`）与被 `cancel` 时各调一次 `prune(this)`。
- **读到尾一律 `controller.close()`**：没有带外 poke，也就没有
  “把 close 换成 error”那个分叉；源报错走 read 拒绝，流自然 error。

### ForkedReadableStreamRegistry（fork 注册表）

- 内部协作类，与 `SourceConsumptionAgent` 同路：平铺字段、普通方法名，
  不带符号表；由分发器构造并持有在受保护字段
  `$I.FORKED_READABLE_STREAM_REGISTRY`（fork 出口自清理要读它，故不能私有）。
- `forks`：活体集（`Set<ForkedReadableStream>`）；`add(fork)` 入册；
  可 `for...of` 遍历——只有降级换读器走它（销毁不走：已建 fork 自决
  生命周期，分发器不伸手）。
- `prune(fork)`：单个出表，**由 fork 自己在两个出口调用**（读到尾、被
  cancel）——出口只有 fork 自己知道，所以这里是自清理而非扫表。
- **不变量：成员资格 = 降级交接名单**。表只有一条义务——降级那一刻
  还读得动的成员一个都不能漏。故出表只能由 fork 自己在出口发起，
  **不存在扫描式清理**：残留的读不动的成员（例如源报错之后）既不会被
  交接，也不会被谁读到，只按体积计费。`destroy()` 之后同理：封口已定，
  未读的拷贝还要读到前沿，谁也不能替它们出表。

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

### 2026-09-18 — 注册表：成员资格就是降级交接名单

- 角色收敛：`ForkedReadableStreamRegistry` 不是"活体统计"，而是**降级
  交接名单**——`$I.DEGRADE` 靠遍历它给每个拷贝换读器、播种位置。由此
  得出唯一义务：降级那一刻还读得动的成员，一个都不能漏；出表只能由
  fork 自己在出口（读到尾 / 被 cancel）发起。
- 结论：**删除扫描式清理**（原 `pruneAll()`：按 `$I.CANCELLED` 重扫）。
  它任意时刻调用都扫不到东西——`$I.CANCELLED` 只在 `cancel` 里置位，
  紧跟着同一同步块就 `prune(this)`，判据与出表共线。
- 为何"误清"不能忍：注册表不只是登记簿——漏掉交接的 fork 会留着
  `BufferChunkReader`，而降级同时已把 stash `DROP`。于是它要么抛
  `ChunkStash has been dropped`，要么在源已尽那一支静默 `done: true`
  截断。判据不准的"多扫几遍"是往正确性上开洞，不是清理。
- 源报错留下的尸体不构成缺口：降级触发点唯一（`toStash`，`degraded`
  置位后至多一次），且只在消费成功的 `pull()` 里可达；源报错后消费
  路径永久停止，故再无降级会鞭到那些尸体——只占内存。
- 代价（记录在案）：表到 fork 的强引用，加上 fork 的 `I.DISTRIBUTOR`
  回引，构成双向强引用——只要消费者还握着任一 fork，整条图（源读器、
  stash 及其字节、源流）都不可回收。"最后一个 fork 被丢弃"是分发器
  可回收的前提。
- 顺带：fork 取注册表改经分发器的受保护符号（见上方
  `$I.FORKED_READABLE_STREAM_REGISTRY`），并在构造器闭包里捕获；于是
  fork 不再持有注册表字段与私有符号。内部类用父级符号的办法是**由本级
  的 `Symbol.mjs` 转发父级表**（`export * as DISTRIBUTOR from '../Symbol.mjs'`）
  ——避免让 `Symbol.mjs` 变成非叶子（那正是此前模块环的成因）。环检查
  脚本（`logs/check-import-cycles.mjs`）：29 个模块，强连通分量 0。

### 2026-09-18 — terminate：延迟暴露的终止信号（09-19 已取代）

- 语义取自 DESIGN 示例注释，本次落地四件：幂等；终止原因落
  `$I.TERMINATION`（`DOMException`，`name` 为 `AbortError`）；当场
  `SOURCE_READER.cancel(原因)` 切断并释放源；按相位把"不再有数据"交给
  落点（内存相位 stash `$I.SET_DONE`，降级相位 transferrer
  `$I.SET_DONE`）。落点选择在 `terminate()` 里就地做（不经过消费代理）：
  `$I.TRANSFERRER` 就是那个选择器，且它是降级唯一的写入点。
- 命名分层（本期定）：原 `destroy()` 改名 `terminate()`——它终结的是
  **可用性**，资源并没有被摧毁（介质还在、拷贝还在跑、源只是被放弃）。
  `destroy` 空出来专指"强制摧毁全部资源"那一档（不延迟暴露）。
  状态/动作/观察三者同名：`$I.TERMINATION` /
- 释放时机取"当场"而非"表空"：源在构造时就被锁死归分发器所有，
  terminate 就是放弃这份源，早释放让连接/FD 立刻回收。DESIGN 原文把它
  排在末尾（"关闭文件 → 释放 source reader"），已改为当场。
- 已建 fork 自决生命周期：读到前沿时按 `$I.TERMINATION` 分叉
  close/error。分发器不做带外 poke，于是 fork 的 `I.CONTROLLER`
  （"留给将来的 destroy 用"）失去唯一用户，连同 `start` 桥一起删。
- 两处必要改动：`ensure()` 的循环与收尾都认
  `cancelled`（否则目标永远追不上，循环对着空目标空转）；
  `SourceReader` 收摊后 `read()` 直接答 `{done:true}`，不再落到已释放的
  reader 上换一个 TypeError。
- 硬档骨架（同日随后落地）：`destroy()` = `terminate()` + 对每个活体
  `fork.$I.ABORT(终止原因)` 带外 errored + `registry.clear()` + stash
  `$I.DROP()`。**顺序**：先 poke 活体再清表（否则名单没了）。
  它自己不持状态——四步各自幂等，故二次 `destroy()` 天然无害。
  被删的 `I.CONTROLLER` 与 `start` 桥随硬档回来（这次它们有真实用户）。
- 未做：写侧介质释放（要写侧先补关闭口）、表空自动收尾（要"表空"通知
  路径）。terminate 后 `fork()` 仍抛错——DESIGN 旧文那句"新 fork() 亦然"
  与此冲突，已改文。
- 实测（`logs/probe-terminate.mjs`）：terminate 幂等；源的 cancel 收到
  同一个 `AbortError`；再 fork 抛错；两个存活拷贝都读完同一个冻结前缀
  并以 `AbortError` 收尾；注册表随各自出表清零。降级相位见
  `logs/probe-terminate-degraded.mjs`（冻结前缀在介质上，仍然不挂死）。
- 拆档修订（同日）：原 terminate 里包含 `SOURCE_READER.cancel()`——取消
  源会触发**源自己的** cancel 回调并释放锁，那是"动别人的东西"，不属于
  "终结自己的可用性"。改为 terminate 不碰源，取消移到 destroy。
  随之必须做的两件（不然不自洽）：① `ensure()` 的"不再拉取"判据从
  `sourceReader.cancelled` 换成分发器的 `$I.TERMINATION`——实验
  `logs/probe-terminate-no-cancel.mjs` 量到：不换判据、只不取消，终止后
  还会再拉一笔（前沿根本没冻结）；② `pull()` 读到数据后复查终止状态、
  作废在途那一笔，否则前沿被它推迟一格。
- 拆档的代价（级联下最明显）：软档不再放弃源，所以**上级的 fork 不会
  因下级 terminate 而退出**，锁定着上级的源直到下级 destroy。
  `probe-cascade.mjs` 已按此更新：`内层 terminate 后 外层表` 保持 1。
- 实测（`logs/probe-destroy.mjs`）：destroy 幂等；注册表 2 → 0；stash
  当场释放；再 `fork()` 抛错；**从未开读过一笔的拷贝也立刻收到
  `AbortError`**（不补缓冲）——这就是“差在何时，不在何物”。两档对照：
  同一个场景用 `terminate()` 时，那个拷贝会先拿到缓冲里的块再收错。

### 2026-09-19 — 闸门与封条：谁关闸门、谁封口

- 模型重定（用户口径）：`$I.TERMINATION` 只是**看大门的标记**——只拒
  新建 fork；已建 fork 照旧运行，**需要数据就继续向源拉取**。
  `terminate()` 只置标记 + 派事件，不封口、不取消源、不碰拷贝。
  **封口（前沿定长）与切断源归 `destroy()`**，已建拷贝各自读到前沿
  自然收尾（`close()`）。
- 由此删掉消费代理里两处 `$I.TERMINATION` 判据，换成各自的真实判据：
  `ensure()` 的循环认“源还能不能拉”（`!sourceReader.finished`）；
  `pull()` 回到加判据之前的样子——不再看任何封口/终止状态。
  两条教训留档：循环不许在没有封口的情况下提前停（终止后不拉取、而
  `stash.done` 只由自然到头或 `destroy` 置 ⇒ 读侧拿
  `{done:false, value:undefined}` 无限空转）；反过来，在 `pull()` 里
  “作废已拉回的一笔”会让 `pulledChunkCount` 不前进、循环条件永远成立
  ⇒ 把源一路抽干、每笔都丢掉、读侧永不返回。
- `ensure()` 的循环还带出一个真坑：`SourceReader.READ` 在 `CANCELLED`
  之后**不再写 `DONE`**（`if (!this[I.CANCELLED]) this[I.DONE] = ...`），
  而 `read()` 一进门就短路答 `{done:true}`。所以 `destroy()` 取消源之后，
  只看 `done` 的循环会“每圈 `SET_DONE` 一次”地转下去——判据必须把
  `cancelled` 算进去（因此有了 `SourceReader.finished`）。
- **在途那一笔不再丢**：`pull()` 曾经有一条“落点已封口就别写”的判据
  （旧模型遗留）。实测（`logs/probe-straggler.mjs`）：留着它，封口瞬间
  已在路上的那一笔被丢掉（拷贝拿到空前缀）；删掉则两拷贝一致地拿到它。
  分叉由 `ensure()` 收尾那句“源已终而仍有在途 pull 就等它”拦住：任何
  拷贝读之前都排在同一个在途 pull 后面，于是封口之后落地的那一笔对谁
  都可见、顺序也一致。降级相位同样实测
  （`logs/probe-degraded-straggler.mjs`，封口落在一次介质写途中）：两个
  拷贝拿到同一笔（`s3`）与同一段尾巴（`s4`），不分叉。
- 截断对读侧不可见（本期取此）：拷贝一律 `close()`，下游分不清“传输
  完整”与“被宿主切断”；要分辨只能靠宿主侧的 `terminate` 事件。旧文
  “下游可据此区分意外终止与策略截断”因此作废；源**报错**那条路不变
  （read 拒绝，流自然 error）。
- 连带给删：`ForkedReadableStream.$I.ABORT`、`I.CONTROLLER` 与 `start`
  桥（唯一用户是 abort）、注册表 `clear()`（唯一用户是 destroy）——都
  不再有调用者。
- 实测：`logs/probe-terminate.mjs`（terminate 后已建拷贝仍在消费源：
  `A 放行(1)` / `B 放行(0)`；再 fork 抛错；`destroy()` 后两拷贝
  `[0,1]`、双双 `close`、同一前缀、表自清）、`logs/probe-destroy.mjs`
  （两拷贝同一前缀 `close`；`stash已释放: false` 是已知缺口）、
  `logs/probe-terminate-degraded.mjs`（降级相位不挂死，双双 `done`）、
  `logs/probe-terminate-degraded-race.mjs`（排水途中 `destroy()`，两拷贝
  同一前缀 `[s0,s1,s2]`）、`logs/probe-cascade.mjs`（内层 `destroy()` 的
  取消向上传：`外层表 0`；外层 `destroy()` 向下传播：无 abort，各拷贝
  自己走到前沿）。
- 已知缺口：`destroy()` 之后 stash 与介质活到 GC（引用计数未实现），
  被遗弃的拷贝会把前缀吊住；更强的强制档留给后续。
