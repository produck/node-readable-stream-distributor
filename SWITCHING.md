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
| 文件 / committedChunks            | 分发器唯一 writer                     |
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
  读各拷贝 consumedChunks → 构造 FileChunkReader(init, skipN, committed)
    → 换入 $I.CHUNK_READER（全部拷贝）
之后（异步）：
  init 链：dump → skip 到位 → 就绪
  read()：总是 await init → 再读文件
```

- `FileChunkReader` 构造时保存 `init`（创建 FileHandler + dump 的
  Promise）；所有 `read()` 都从 `init` then/await 出来。
- skip 到位在 `init` 过程中完成（按旧 ChunkReader 进度定位）。
- 切换期间到达的 pull 自然 `await init` 挂着——Promise 就是调度队列，
  无需显式暂停/排队机制，`ForkedReadableStream.pull` 零切换感知。

### 两个注意细节

- **进度初始化**：skip 是定位不是新消费。`FileChunkReader` 就绪时须把
  基类 `I.CONSUMED` 初始化为 `skipN`（而非靠 `read()` 累计），否则进度
  记错，后续再切换会出错。需基类提供"设置初始进度"途径。
- **文件句柄生命周期**：所有拷贝共享同一 `init`（同一 fileHandle）。
  `close()` 归最后一个离开的拷贝（done/cancel/destroy 皆算），
  归属要在协议里定清，避免提前关闭或泄漏。

## 分发器与 ChunkReader 构造协议（已明确）

> 2026-08-26 设计讨论修订：移除分发器 `id`；转存职责移到
> `AbstractFallbackChunkReader` 静态侧（`_S.DUMP` + `dump()`）；
> 不设 `_I.OPEN`。下文标注"已认可"的为定稿方向，其余待定。

- **分发器 `id`**：每个分发器对应一个 SourceStream，持有一个 UUID
  作为唯一标识（构造时生成），供存储工件唯一命名。
  **已移除**（已认可，2026-08-26）：分发器不承担标识职能。ChunkStash
  作为数据制品层承担数据职责；若某个回退方案需要字符串 `id`，那是
  该回退方案（下游）的责任，`DUMP` 逻辑自理。
- **构造上下文**：分发器创建 ChunkReader 时提供共享 `chunkStash` 与
  `progress`（该拷贝 `consumedChunks`，skip 位置）。`BufferChunkReader`
  直接读 `chunkStash`；回退读取器切换时由静态转存执行 `drop()`。
  reader 其余要素由子类自己实现；分发器不提供存储实现细节（临时
  目录、文件句柄、路径），也不提供 `id`——`id` / 文件名等属回退
  策略内部细节。
- **`AbstractFallbackChunkReader` 抽象中间层**：回退读取器家族的统一
  基类。转存职责在**静态侧**：
  - 抽象静态成员 `_S.DUMP`（已认可）：**靠参数拿到 `chunkStash`**，
    负责转存 ChunkStash 数据到回退存储并执行 `stash.drop()`。返回
    **PromiseOr**（已认可）。
  - 配套公开静态成员 `dump()`（已认可命名）：调用 `_S.DUMP`，把
    返回值 **Promisify** 并做**抽象层异常处理修饰**，将生成的
    Promise 记录到 `S.DUMPING`（WeakMap）上（已认可）。
  - 静态成员 `S.DUMPING`（已认可）：Fallback 抽象层自持的 WeakMap，
    管理 `_S.DUMP` 返回的东西（`ChunkStash` ↔ 转存 Promise）。
  - 实例级查询成员 `getChunkStashDumping()`（已认可）：实例读取器
    从 `S.DUMPING` 查询其 `ChunkStash` 对应的转存 Promise。
  - 【待定：实例如何访问静态 `S.DUMPING`（如 `this.constructor`）；
    异常处理修饰的具体形式（错误包装/类型）】
  - **Fallback 自定义资源可自备 WeakMap**（已认可）：转存后副作用
    （产物）经回退策略自备的 WeakMap 机制传递给实例读取器。例如
    文件回退在 `DUMP` 时自行生成 uuid 或文件名；`id` / 文件名等是
    回退策略自己的内部细节，非分发器职责。
  - 实例级回退读取器构造时经受保护 `$I.CHUNK_STASH` 持有共享
    `chunkStash`（已认可：维持受保护、不新增符号，构造阶段与
    `AbstractChunkReader` 协议对齐），**所有初始化过程都 await
    dumping**（已认可）。
  - **`await dumping` 只提供阻塞，不提供产物**（已认可）：它是转存
    完成的屏障。时序为分发器先执行静态 `dump()`，再并发 `new`
    实例，再并发开始初始化；初始化中的 `await this.getChunkStashDumping()`
    自然等待转存完成；若转存已完成则直接通过。产物传递走回退策略
    自备的 WeakMap，与 dumping 屏障解耦。
  - **不设 `_I.OPEN`**（已认可）：`OPEN` 是文件类 Fallback 的领域
    术语，抽象初始化 `_I.INITIALIZE` 已包含 open 概念。
  - 【待定：`_S.DUMP` 返回的 Promise resolve 值（转存产物）的结构；
    实例侧 `_I.INITIALIZE` / `_I.READ` 具体签名】
- **TemporaryFileChunkReader**（未来）：临时文件目录通过**配置方法 +
  默认实现**提供，属子类职责，非分发器维护。它是
  `AbstractFallbackChunkReader` 的 Node 文件系统实现；浏览器分支
  （IndexedDB / OPFS）同挂其下。
- **动态替换回退 reader 类**：分发器提供"设置回退 ChunkReader 类"的
  方法，可动态替换存储降级阶段使用的 reader 子类（"回退策略读取器
  机制"，呼应 BROWSER.md 存储降级策略抽象）。

## 背景与目标

`Buffer[]` 累计超过 `highWaterMark` 时，分发器从内存阶段切换到
文件阶段。切换必须是**可靠的**——任何拷贝在任何时刻都只能读到
连续完整前缀，不允许读到半截 chunk 或跳号。

本协议讨论切换期间各方的协调，确保：

- 切换对拷贝流透明（拷贝只感知 `read()` 的返回值）
- 切换期间无竞态（dump 与读 buffer 互斥）
- 快慢拷贝的 skip 位置正确
- 切换中的新 fork / cancel / destroy 行为确定

## 待定问题清单

### 1. 触发与状态机

- 何时判定需要切换？`Buffer[]` 累计超过 `highWaterMark` 即触发？
  是否需要二次确认（避免瞬态抖动）？
- 三态模型：`in-memory` / `switching` / `in-file`。
  `switching` 是瞬态还是可持续状态？
- 谁驱动状态推进？source 拉取协程？独立异步任务？

### 2. 竞态清单

- [x] dump 进行中，拷贝 pull 从 BufferReader 读 → 半截数据
      已解：同 tick 换读器后无拷贝再碰 buffer。
- [x] 回退读取器在 dump 完成前读取 → 读到不完整/半截数据
      已解（框架层落定 2026-08-28）：`AbstractFallbackChunkReader`
      的 `_I.INITIALIZE` await dumping 屏障（`S.DUMPING`），`read()` /
      `close()` await `I.INITIALIZED`，转存完成前绝不读；所有消费者
      共享同一 Promise 屏障，dump 失败统一转义并传播给所有（含迟到）
      消费者。
- [ ] switching 期间新 `fork()` 的拷贝 → 拿到的 reader 指向何物？
- [ ] 切换途中某拷贝 `cancel` / `destroy` → 未完成的 reader 怎么办？
- [x] 慢拷贝落后：skip 位置 = 该拷贝 `consumedChunks`，如何保证
      切换瞬间读到的是已 dump 的边界？
      已解：skip 到位在 init 过程中，`read()` await init 后才读文件。
- [ ] dump 期间 source 有新数据到达 → 先入 buffer 还是直接入文件？

> 剩余未决项集中在**分发器侧调度**：切换触发与 `dump()` 调用时机、
> 同 tick 原子换读器、切换中 `fork`/`cancel`/`destroy` 行为、source
> 暂停/恢复衔接。

### 3. 协调原语

- pull 如何在 switching 期间排队 / 等待？
  已解方向：无需显式排队，pull 的 `read()` 天然 `await init`。
- 读器替换的"原子性"边界：对拷贝流而言，`$I.CHUNK_READER` 一次
  替换是否足够？是否需要"先暂停、再换、再放行"？
  已解方向：同 tick 换读器即原子，无需三拍。
- 背压与切换的交互：切换本身是背压点，还是与既有背压点（dump
  未完成暂停 source.read）合并？

### 4. FileChunkReader 接口

- 构造：分发器传 `{ progress, chunkStash }` 上下文（`id` 已移除，
  属回退策略内部细节）；文件句柄等存储要素由子类自建
  （TemporaryFileChunkReader 的临时目录走配置 + 默认实现）。回退
  读取器继承 `AbstractFallbackChunkReader`，实现 `_S.DUMP` 及继承的
  `_I.READ` / `_I.CLOSE`。
- `_I.READ` 如何按 position 游标前进？
- `I.CONSUMED` 初始化为 skip 位置（skip 是定位非新消费）
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
