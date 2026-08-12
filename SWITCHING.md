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
- 单线程 JS 中 `await` 是天然顺序化点：`await flush → 换读器` 不可能
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
  → flush Buffer[] → 算各拷贝 skip → 换读器 → 恢复拉取
```

切换天然并入既有背压点（flush 未完成暂停 source.read），不是新增机制。

### 实现范围约束

- **Distributor**（`Abstract.mjs` + 其 `I/$I` 状态）：唯一允许触碰
  `SOURCE_READER`、`BUFFER`、文件、阶段状态的代码。
- **ChunkReader**（`ChunkReader/`）：纯读取装置，只维护自身进度
  （`I.CONSUMED`），不接触分发器共享状态。
- **ForkedReadableStream**（`ForkedReadableStream/`）：面向消费者的
  流面，只经 `I.CHUNK_READER` 与其 `$I.CHUNK_READER` 保护存取器交互，
  对协调无感。
- 跨模块共享状态访问一律走明确的契约接口，不得越权直接写。

## 背景与目标

`Buffer[]` 累计超过 `highWaterMark` 时，分发器从内存阶段切换到
文件阶段。切换必须是**可靠的**——任何拷贝在任何时刻都只能读到
连续完整前缀，不允许读到半截 chunk 或跳号。

本协议讨论切换期间各方的协调，确保：

- 切换对拷贝流透明（拷贝只感知 `read()` 的返回值）
- 切换期间无竞态（flush 与读 buffer 互斥）
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

- [ ] flush 进行中，拷贝 pull 从 BufferReader 读 → 半截数据
- [ ] switching 期间新 `fork()` 的拷贝 → 拿到的 reader 指向何物？
- [ ] 切换途中某拷贝 `cancel` / `destroy` → 未完成的 reader 怎么办？
- [ ] 慢拷贝落后：skip 位置 = 该拷贝 `consumedChunks`，如何保证
      切换瞬间读到的是已 flush 的边界？
- [ ] flush 期间 source 有新数据到达 → 先入 buffer 还是直接入文件？

### 3. 协调原语

- pull 如何在 switching 期间排队 / 等待？
- 读器替换的"原子性"边界：对拷贝流而言，`$I.CHUNK_READER` 一次
  替换是否足够？是否需要"先暂停、再换、再放行"？
- 背压与切换的交互：切换本身是背压点，还是与既有背压点（flush
  未完成暂停 source.read）合并？

### 4. FileChunkReader 接口

- 构造参数：`(fileHandle, skipChunks, committedChunks)`？
- `_I.READ` 如何按 position 游标前进？
- 与 flush 的读写顺序保证（先写后读？）

### 5. 错误路径

- flush 中途失败（磁盘满、写错误）
- 文件打开失败
- 切换中断后的恢复 / 降级

## 已知约束（讨论前提）

- flush 使用 `fs.promises.open` + FileHandle（DESIGN.md 已假定
  `fileHandle.read/write`），异步 I/O。
- `ForkedReadableStream.$I.CHUNK_READER` 保护存取器（get/set）是换读器
  的契约接口，切换实现将基于它。
