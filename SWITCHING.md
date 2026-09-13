# 策略切换协调协议（讨论稿）

> 本文件是内存→文件阶段切换的专门讨论空间。先讨论、后落笔。
> 所有内容均为待定草案，不构成已定设计。

## 核心基调

**消费永远是异步的。** 这是整个设计的顶层事实，也是所有协调协议的
立足点：

- 消费者 `reader.read()` 永远返回 Promise；单流内 `pull` 不并发重入。
- 数据流本身是异步的——即便 Buffer 阶段的 chunk 是内存暂存，它们
  也是从 source 流异步消费而来的。
- 因此 `ChunkReader.read()` 对所有实现统一保持 Promise 化（async）
  是**如实建模**，不是妥协：
  - BufferChunkReader 内部可以同步推进（如 index++），但接口统一 async，
    与 FileChunkReader 的异步 I/O 对齐。
  - 正是这个统一 async 契约，让 `$I.CHUNK_READER` 切换透明——拷贝
    不关心前后是不是同一个 reader。
- 单线程 JS 中 `await` 是天然顺序化点：`await dump → 换读器` 不可能
  穿插。可靠性来自 Promise 顺序化，而非同步 I/O。

## 单一协调者模型（已明确）

**分发器是唯一协调者。** 所有共享可变状态由一个协调者集中处理，
这是确定的职责，不是实现偏好。

| 共享状态                          | 谁碰                                  |
| --------------------------------- | ------------------------------------- |
| source reader                     | 仅分发器（唯一 source 消费者）        |
| `Buffer[]`                        | 分发器写；拷贝经自己的 ChunkReader 读 |
| 降级存储                          | 降级策略写入（分发器触发 dump）       |
| 阶段状态（memory/switching/file） | 分发器                                |
| 拷贝集                            | 分发器；拷贝经保护契约注销            |

**拷贝是"哑消费者"**——只通过自己私有的 ChunkReader 读取，从不
直接触碰共享状态。切换是分发器编排的**异步过程**，不是瞬态：

```text
进入 switching → 暂停 source 拉取 → fs.promises.open
  → dump Buffer[] → 算各拷贝 skip → 换读器 → 恢复拉取
```

切换天然并入既有背压点（dump 未完成暂停 source.read），不是新增机制。

### 实现范围约束

- **Distributor**（`Abstract.mjs` + 其 `I/$I` 状态）：唯一允许触碰
  `SOURCE_READER`、`BUFFER`、文件、阶段状态的代码。
- **ChunkReader**（`ChunkReader/`）：纯读取装置，只维护自身进度
  （`I.CONSUMED`），不接触分发器共享状态。
- **ForkedReadableStream**（`ForkedReadableStream/`）：面向消费者的
  流面，只经 `I.CHUNK_READER` 与其 `$I.CHUNK_READER` 保护存取器交互，
  对协调无感。
- 跨模块共享状态访问一律走明确的契约接口，不得越权直接写。

## 已收敛设计：`init` Promise 屏障

切换竞态的核心解法已收敛为 **`init` Promise 屏障**，依托"read 恒为
Promise"这一事实：

### 同 tick 换读器

换读器全程**同步**，同一 tick 内一次完成，杜绝"读半截 buffer"窗口：

```text
同 tick（同步）：
  读各拷贝 consumedChunks → 构造降级 reader
    → $I.REQUEST_INITIALIZE(consumedChunks) → 换入 $I.CHUNK_READER
之后（异步）：
  init 链：await dumping 屏障 → 叶子按播种位置自定位 → 就绪
  read()：总是 await init → 再读
```

- 降级 reader 的初始化经 `I.INITIALIZED`（`_I.INITIALIZE` 返回的
  Promise）承接；所有 `read()` / `close()` 都 await 它。
- skip 到位在 `init` 过程中完成：降级 `$I.REQUEST_INITIALIZE(progress)`
  先播种 `$I.CONSUMED = progress`，叶子按此规定位置自实现定位
  （经家族抽象 `_I.SEEK` 逐界寻道，或存储级 O(1) 跳转）。
- 切换期间到达的 pull 自然 `await init` 挂着——Promise 就是调度队列，
  无需显式暂停/排队机制，`ForkedReadableStream.pull` 零切换感知。

### 两个注意细节

- **进度初始化（2026-09-09 定稿）**：skip 是定位不是新消费。播种途径
  为降级 `$I.REQUEST_INITIALIZE(progress)`：它在调 `_I.INITIALIZE` 前把
  `$I.CONSUMED` 置为 `progress`（= skipN），而非靠 `read()` 累计，否则
  进度记错、后续再切换出错。分发器是唯一调用者；初始化无 once-guard
  （2026-09-09 迁往降级家族，`I.INITIALIZATION_STARTED` 已删）。
- **文件句柄生命周期**：所有拷贝共享同一 `init`（同一 fileHandle）。
  `close()` 归最后一个离开的拷贝（done/cancel/destroy 皆算），
  归属要在协议里定清，避免提前关闭或泄漏。

### dump 期间停靠模型（已认可，2026-09-04）

`await dumping` 屏障的阻塞是**局部停靠**，不是全局阻塞：

- **非全局阻塞**：transferrer 的 `dump()` 为异步转存，不采用同步写/事件循环
  阻塞；逐块 `await` 写盘时控制权让回事件循环，不饿死其他任务。
- **局部停靠**：只有依赖降级数据、正 `await dumping` 的 reader 续延
  被挂起；仍在内存阶段或已追平的 fork 不受影响。
- **量级**：`stashByteLimit` 低时转存量小、停靠可忽略；高 + 慢盘时停靠时长
  随转存量线性放大，成为感知抖动源。
- **深度优化方向（future work）**：让降级 reader 在 dump 追加过程中
  增量可读——不等待"全量 dump 完成"这一单点，按各 fork 进度无缝
  交接，仅最落后尾巴等待。代价：reader 与 writer 的位置/顺序耦合，
  复杂度明显更高。现阶段不实现。

## 分发器与 ChunkReader 构造协议（已明确）

> 2026-08-26 设计讨论修订：移除分发器 `id`；转存职责移到
> `AbstractDegradedChunkReader` 静态侧（`_S.DUMP` + `dump()`）；
> 不设 `_I.OPEN`。下文标注"已认可"的为定稿方向，其余待定。
>
> 2026-09-07 修订：转存职责迁出 reader——`AbstractDegradedChunkReader`
> 回归纯读；写侧抽为独立 **Transferrer**（家族内部抽象实例：`dump` /
> `write` / per-stash dumping），具体 reader 经一次性静态成员
> `transferrer` 配置其配套 Transferrer 实例。原静态 `_S.DUMP` /
> `S.DUMPING` / `getChunkStashDumping` 相应改为 Transferrer 成员。

- **分发器 `id`**：每个分发器对应一个 SourceStream，持有一个 UUID
  作为唯一标识（构造时生成），供存储工件唯一命名。
  **已移除**（已认可，2026-08-26）：分发器不承担标识职能。ChunkStash
  作为数据制品层承担数据职责；若某个降级方案需要字符串 `id`，那是
  该降级方案（下游）的责任，`DUMP` 逻辑自理。
- **构造上下文**：分发器创建 ChunkReader 时提供共享 `chunkStash`
  （2026-09-09：`progress` 不再入构造）。进度作为请求初始化的参数：
  分发器调用受保护 `$I.REQUEST_INITIALIZE(progress)`（`progress` = 该
  拷贝 `consumedChunks`，即 skip 位置），降级在调 `_I.INITIALIZE` 前
  先播种 `$I.CONSUMED = progress`。`BufferChunkReader` 直接读
  `chunkStash`；降级时由分发器在 dump 成功后封存（`$I.DROP`）。
  reader 其余要素由子类自己实现；分发器不提供存储实现细节（临时
  目录、文件句柄、路径），也不提供 `id`——`id` / 文件名等属降级
  策略内部细节。
- **`AbstractDegradedChunkReader` 抽象中间层（纯读）**：降级读取器家族
  的统一基类。写侧不在本类（2026-09-07 迁往 Transferrer）：
  - 实例经受保护 `$I.CHUNK_STASH` 持有共享 `chunkStash`（已认可：
    维持受保护、不新增符号，构造阶段与 `AbstractChunkReader` 协议
    对齐），**所有初始化过程都 await dumping**（已认可）。
  - **一次性静态成员 `transferrer`**（2026-09-07 定稿）：具体 reader
    类须先配置一个 `AbstractTransferrer` 实例（守卫式 setter：一次性
    不可变 + `instanceof AbstractTransferrer`）；未配置不能 `new`。
    实例初始化经 `I.CONSTRUCTOR.transferrer` 取 dumping 屏障。
  - **`chunkStashDumping`**（实例 getter，2026-09-07 定稿）：返回
    `transferrer.getDumping(本 stash)`——即 dumping 屏障，仅阻塞、
    不提供产物。
  - **不设 `_I.OPEN`**（已认可）：`OPEN` 是文件类降级的领域术语，
    抽象初始化 `_I.INITIALIZE` 已包含 open 概念。
- **`AbstractTransferrer`（写侧内部抽象，2026-09-07 定稿）**：
  - 公开实例 `dump(chunkStash)`：调用抽象 `_I.DUMP`，Promisify +
    抽象层异常转义，登记 per-stash dumping Promise。
  - 抽象实例 `_I.DUMP`（下游实现）：**靠参数拿到 `chunkStash`**，
    负责转存 ChunkStash 到降级目标（不含封存），返回 PromiseOr。
    封存（drop）由分发器在 dump 成功后执行。
  - 公开实例 `async write(chunkStash, buffer)`：先 `await` 该 stash
    的 dumping 屏障再经抽象 `_I.WRITE` 追加（返回 `undefined`）。
  - 公开实例 `getDumping(chunkStash)`：查询 per-stash dumping。
  - **Degraded 自定义资源可自备 WeakMap**（已认可，语义不变）：转存
    产物经降级策略自备 WeakMap 传递给 reader；例如文件降级在 `DUMP`
    时自行生成 uuid 或文件名；`id` / 文件名等是降级策略内部细节，
    非分发器职责。
  - **`await dumping` 只提供阻塞，不提供产物**（已认可，语义不变）：
    时序为分发器先触发 `transferrer.dump()`，再并发 `new` reader
    实例，再并发开始初始化；初始化 `await chunkStashDumping` 自然
    等待转存完成；若已完成则直接通过。产物传递走降级策略自备的
    WeakMap，与 dumping 屏障解耦。
  - 【待定：`_I.DUMP` 返回的 Promise resolve 值（转存产物）的结构；
    实例侧 `_I.INITIALIZE` / `_I.READ` 具体签名】
- **TemporaryFileChunkReader**（未来）：临时文件目录通过**配置方法 +
  默认实现**提供，属子类职责，非分发器维护。它是
  `AbstractDegradedChunkReader` 的 Node 文件系统实现；浏览器分支
  （IndexedDB / OPFS）同挂其下。
- **动态替换降级 reader 类**：分发器提供"设置降级 ChunkReader 类"的
  方法，可动态替换存储降级阶段使用的 reader 子类（"降级策略读取器
  机制"，呼应 BROWSER.md 存储降级策略抽象）。

## 背景与目标

`ChunkStash` 累计超过 `stashByteLimit` 时，分发器从内存阶段切换到
文件阶段。切换必须是**可靠的**——任何拷贝在任何时刻都只能读到
连续完整前缀，不允许读到半截 chunk 或跳号。

本协议讨论切换期间各方的协调，确保：

- 切换对拷贝流透明（拷贝只感知 `read()` 的返回值）
- 切换期间无竞态（dump 与读 buffer 互斥）
- 快慢拷贝的 skip 位置正确
- 切换中的新 fork / cancel / destroy 行为确定

## 待定问题清单

### 1. 触发与状态机

- 何时判定需要切换？`ChunkStash` 累计超过 `stashByteLimit` 即触发？
  是否需要二次确认（避免瞬态抖动）？
- 三态模型：`in-memory` / `switching` / `in-file`。
  `switching` 是瞬态还是可持续状态？
- 谁驱动状态推进？source 拉取协程？独立异步任务？

### 2. 竞态清单

- [x] dump 进行中，拷贝 pull 从 BufferChunkReader 读 → 半截数据
      已解：同 tick 换读器后无拷贝再碰 buffer。
- [x] 降级读取器在 dump 完成前读取 → 读到不完整/半截数据
      已解（框架层 2026-08-28；2026-09-07 随 Transferrer 更新）：降级
      reader 的 `_I.INITIALIZE` await 其 stash 的 dumping 屏障
      （`chunkStashDumping` ← transferrer 的 per-stash dumping），
      `read()` / `close()` await `I.INITIALIZED`，转存完成前绝不读；
      所有消费者共享同一 Promise 屏障，dump 失败统一转义并传播给所有
      （含迟到）消费者。
- [ ] switching 期间新 `fork()` 的拷贝 → 拿到的 reader 指向何物？
- [ ] 切换途中某拷贝 `cancel` / `destroy` → 未完成的 reader 怎么办？
- [ ] **在途 `read` 仍绑旧读器**：`pull` 先取 `$I.CHUNK_READER` 再调
      `$I.READ`，而 `$I.READ` 内的 `ensure()` 期间会换读器——`this` 仍是旧
      的内存读器；DROP 之后它再读即抛 `ChunkStash has been dropped`
      （实测：DROP 前读旧 stash 的块正常，DROP 后抛）。可选收法：`pull`
      在 `ensure()` 之后重取读器 / 不 DROP 而把相位事实改为 `stash.sealed` /
      接受此窗口。
- [x] 慢拷贝落后：skip 位置 = 该拷贝 `consumedChunks`，如何保证
      切换瞬间读到的是已 dump 的边界？
      已解：skip 到位在 init 过程中，`read()` await init 后才读文件。
- [ ] dump 期间 source 有新数据到达 → 先入 buffer 还是直接入文件？

> 剩余未决项集中在**分发器侧调度**：切换触发与 `dump()` 调用时机、
> 同 tick 原子换读器、切换中 `fork`/`cancel`/`destroy` 行为、在途
> `read` 的旧读器窗口、source 暂停/恢复衔接。

### 3. 协调原语

- pull 如何在 switching 期间排队 / 等待？
  已解方向：无需显式排队，pull 的 `read()` 天然 `await init`。
- 读器替换的"原子性"边界：对拷贝流而言，`$I.CHUNK_READER` 一次
  替换是否足够？是否需要"先暂停、再换、再放行"？
  已解方向：同 tick 换读器即原子，无需三拍。
- 背压与切换的交互：切换本身是背压点，还是与既有背压点（dump
  未完成暂停 source.read）合并？

### 4. 降级读取器接口

- 构造：分发器传 `{ chunkStash }` 上下文（`id` 已移除，属降级策略
  内部细节；`progress` 不再入构造，2026-09-09）；文件句柄等存储要素
  由子类自建（TemporaryFileChunkReader 的临时目录走配置 + 默认实现）。
  降级读取器继承 `AbstractDegradedChunkReader`（纯读，实现继承的
  `_I.*`）；写侧配套一个继承 `AbstractTransferrer` 的子类（`_I.DUMP` /
  `_I.WRITE`），并经 reader 的一次性静态成员 `transferrer` 配置挂上。
- **寻道定位在叶子**（2026-09-09）：`$I.REQUEST_INITIALIZE(progress)`
  播种 `$I.CONSUMED = progress`（规定位置）；降级叶子的 `_I.INITIALIZE`
  （await dumping 屏障后）按 `consumedChunks` 自实现定位——经家族
  抽象 `_I.SEEK`（只读 4B 头并前进游标、不读 body）逐界寻道，或按
  存储做 O(1) 跳转。基类不含 `_I.SEEK` / `$I.SKIP`（定位非通用驱动器）。
- `_I.READ` 按 position 游标前进（读 body）。
- 文件句柄关闭归属：最后一个拷贝离开时 close

### 5. 错误路径

- dump 中途失败（磁盘满、写错误）
- 文件打开失败
- 切换中断后的恢复 / 降级

## 已知约束（讨论前提）

- dump 使用 `fs.promises.open` + FileHandle（DESIGN.md 已假定
  `fileHandle.read/write`），异步 I/O。
- `ForkedReadableStream.$I.CHUNK_READER` 保护存取器（get/set）是换读器
  的契约接口，切换实现将基于它。
