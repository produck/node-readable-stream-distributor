# ReadableStreamDistributor 设计文档

## 目标

`ReadableStream` 是单消费者模型——chunk 被一个消费者读走就从流中消失。
分发器打破这个限制：将一个源流分发给多个消费者，每个获得完整、独立
拷贝。消费进度互不干扰——快的不用等慢的，慢的不会丢数据。source
推进速率由全体消费者中最快的那一个自然驱动，慢者从磁盘追。

当所有消费者停止消费时，源流自动释放。

支持内存缓存自动溢出到磁盘，chunk 边界保持一致。

## 核心语义

```text
主入口流（唯一真实来源）
  → register({ label }) → { stream, unregister() }
  → 每个拷贝流独立消费
  → 任一拷贝 cancel 不影响其他
  → 拷贝消费完毕（done）或 cancel 均自动清理引用
  → unregister() 仅用于主动提前终止
  → 当且仅当所有拷贝都离开
  → 主入口流 reader.cancel() / releaseLock()
```

## API

`ReadableStreamDistributor` 提供默认实现，下游按需覆盖。

- `get highWaterMark()` → `os.freemem()`
- `get tmpdir()` → `os.tmpdir()`（实时读环境变量 `TMPDIR`，
  运维可在线调整，无需重启进程）

构造条件：`source` 必须未被锁定（`source.locked === false`），
否则拒绝构造。

```js
import { ReadableStreamDistributor } from '@produck/readable-stream-distributor';

// 零覆盖：全部默认即可用
const distributor = new ReadableStreamDistributor(source);

// 或按需覆盖
class MyDistributor extends ReadableStreamDistributor {
  get highWaterMark() {
    return this.config.maxBufferSize ?? super.highWaterMark;
  }
  get tmpdir() {
    return this.config.tmpdir ?? super.tmpdir;
  }
}
const distributor = new MyDistributor(source);

// 注意：一旦溢出到磁盘后，highWaterMark 不再被查询（单向门）

const copy = distributor.register({ label: 'sha1-checker' });
// label：助记符，用于事件和统计中标识拷贝，不作唯一性约束
// → { stream: ReadableStream, unregister(): void }

// 正常消费
const reader = copy.stream.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
}

// 提前终止——不影响其他拷贝（正常消费完毕无需手动调用）
copy.unregister();

// 消费者 cancel 自己的 stream 也会自动清理引用
reader.cancel();

// 强制销毁（框架层策略执行：body 超限、请求超时、客户端断开等）
// 与错误传播同模式——延迟暴露，不对拷贝搞突袭：
// 分发器标记为已销毁 → 不再从 source 拉取新 chunk
// → 各拷贝照常消费已缓冲数据 → 耗尽后 stream error
// → error 为可辨识类型（如 AbortError），下游可据此区分
//    意外终止（source error）与策略截断（destroy）
// → 关闭文件 → 释放 source reader → 分发器不可再用
distributor.destroy();
```

## 架构

```mermaid
graph TD
    SOURCE["source reader<br/>(唯一真实来源)"] --> DIST[ReadableStreamDistributor]

    subgraph Distributor
        DIST --> BUFFER["Buffer[]<br/>内存阶段"]
        BUFFER --> BROADCAST["广播到所有活跃拷贝"]
        BROADCAST --> COPY_A["拷贝 A"]
        BROADCAST --> COPY_B["拷贝 B"]
        BROADCAST --> COPY_N["拷贝 N"]

        BUFFER -- "超过阈值" --> FILE["chunk 文件<br/>[4B len][data]..."]
        FILE -- "替换 ChunkReader<br/>skip 到位" --> COPY_A
        FILE -- "替换 ChunkReader<br/>skip 到位" --> COPY_B
    end

    COPY_A --> CONSUMER_A["消费者 A"]
    COPY_B --> CONSUMER_B["消费者 B"]
    COPY_N --> CONSUMER_N["消费者 N"]

    BUFFER -- "满且 flush 未完成 →<br/>暂停 source.read()" --> SOURCE
    COPY_A -- "unregister" --> COUNTER{"活跃计数 -1"}
    COPY_B -- "unregister" --> COUNTER
    COUNTER -- "归零 → reader.cancel()" --> SOURCE
```

### 模块

| 模块                          | 职责                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `ReadableStreamDistributor`   | 抽象类——多拷贝分发，引用计数，策略切换。`highWaterMark` 由下游实现 |
| `ChunkStash`                  | 共享内存缓冲容器——聚合 chunk，`drop()` 一次性清空并密封            |
| `BufferChunkReader`           | 内存阶段——直接消费共享 `ChunkStash`，按 index 读取                 |
| `AbstractFallbackChunkReader` | 回退读取器抽象中间层——强制切换公共动作（含 `drop()`），不绑定存储  |
| `TemporaryFileChunkReader`    | （未来）文件阶段——回退抽象层的 Node 文件系统实现                   |
| chunk 文件格式                | `[4B len][chunk data]...` 自描述序列                               |

## 缓存文件格式

自描述 chunk 序列。内存→文件切换后，消费者看到的 chunk
边界与实时消费时完全一致。

```mermaid
packet-beta
title Chunk 文件格式
0-31: "length (u32 BE)"
32-95: "chunk data (variable)"
96-127: "length (u32 BE)"
128-191: "chunk data (variable)"
192-223: "length (u32 BE)"
224-287: "chunk data (variable)"
```

- 写入：每 chunk `[4B BE uint32 length][body]`
- 回放：读 4B → 读 N 字节 → `enqueue` → 循环
- 回放时用 `fileHandle.read(buffer, offset, length, position)` 逐块游标前进

## 内存存储格式

内存阶段用 `Buffer[]` 数组，不与文件共用 `[4B len][chunk]` 格式。

`Buffer` 自带 `.length`，数组元素天然分隔 chunk。回放行为
与文件路径对称——两种存储格式对外吐出的 chunk 序列完全一致。

不可用单一大 `Buffer.alloc()` ——实际写入大小大概率不匹配，
小 body 时浪费巨大，大 body 时仍需溢出。

切换文件时，先将 `Buffer[]` 内容按文件格式写入，清空数组，
后续 chunk 直接走文件。

内存→磁盘是单向门：一旦切换，`highWaterMark` 后续变化不再
生效——木已成舟，不再回头。

## Chunk 读取器

**术语**：`ChunkReader` —— 一片一片读取 chunk 的概念装置。每个拷贝
持有独立的 `ChunkReader`，策略切换时替换读取器，提前 skip 到位。

与 `source reader`（从源流拉取的 reader）区分：`ChunkReader` 是拷贝
侧的读取装置，`source reader` 是分发器侧的拉取装置，二者职责不同，
代码与文档中不共用 `READER` 一词。

### 接口

```js
interface ChunkReader {
  read(): Promise<{ value: Uint8Array, done: boolean }>;
}
```

### 分叉架构

`ChunkReader` 家族在消费 `ChunkStash` 的方式上分叉：

```mermaid
graph BT
    BufferChunkReader["BufferChunkReader<br/>直接读共享 ChunkStash"]
    AbstractFallbackChunkReader["AbstractFallbackChunkReader<br/>回退切换公共动作"]
    TemporaryFileChunkReader["TemporaryFileChunkReader<br/>文件回退实现（未来）"]
    AbstractChunkReader["AbstractChunkReader<br/>生命周期/进度/初始化屏障"]
    BufferChunkReader --> AbstractChunkReader
    AbstractFallbackChunkReader --> AbstractChunkReader
    TemporaryFileChunkReader --> AbstractFallbackChunkReader
```

- `BufferChunkReader` 直接消费共享 `ChunkStash`（按 index 读，`done`
  由 `stash.length` 决定），是内存路径分支。
- `AbstractFallbackChunkReader` 是回退读取器家族的抽象中间层：无论
  具体回退存储是什么，切换都执行同一套公共动作——打开/填充回退存储
  → `stash.drop()`，由该层模板强制；具体存储读写（`_I.OPEN`、继承的
  `_I.READ` / `_I.CLOSE`）由子类实现。
- `TemporaryFileChunkReader` 是 `AbstractFallbackChunkReader` 的 Node
  文件系统实现；浏览器分支（IndexedDB / OPFS）同挂其下。

### 切换流程

```mermaid
sequenceDiagram
    participant SRC as source reader
    participant DIST as Distributor
    participant BUF as Buffer[]
    participant FILE as chunk 文件
    participant A as 拷贝 A (领先)
    participant B as 拷贝 B (落后)

    SRC->>DIST: read() chunk 1..10
    DIST->>BUF: push(chunk)
    DIST->>A: enqueue(chunk 1..10)
    DIST->>B: enqueue(chunk 1, 2)
    Note over B: 暂停消费，进度停留在 chunk 2

    BUF-->>BUF: 累计超过阈值
    DIST->>FILE: 将 Buffer[] 内容写入<br/>[4B len][chunk 1]..[chunk 10]
    DIST->>A: 替换读取器: BufferChunkReader → TemporaryFileChunkReader<br/>已消费 10 个 → 不从文件回放
    DIST->>B: 替换读取器: BufferChunkReader → TemporaryFileChunkReader<br/>只消费 2 个 → skip 前 2 个 chunk → 从 chunk 3 开始 enqueue
    DIST->>BUF: 清空

    SRC->>DIST: read() chunk 11..
    DIST->>FILE: write(chunk 11..)
    DIST->>A: 实时 enqueue(chunk 11..)
    DIST->>B: 回放 chunks 3-10 → 无缝切换到 chunk 11..
```

## 读写协调

多拷贝 reader + 单一 writer 共享同一临时文件。
无需 `fcntl`、文件锁、OS 级协调。

三层保障：

1. **JS 单线程 + await**——`write` 之后的 `committedChunks++`
   一定在数据到达内核页缓存后执行；reader 的 `read` 在
   水位线未到前不会跨过 `await`
2. **libuv 线程池**——`write()` 阻塞直到内核接受数据
3. **OS 页缓存一致性**——不同 fd 读同一偏移量，看到
   write 完成后的数据

一个共享整数 `committedChunks` + Promise 唤醒即足够。

## 引用计数生命周期

```mermaid
sequenceDiagram
    participant SRC as source reader
    participant DIST as Distributor
    participant A as 拷贝 A (SHA1)
    participant B as 拷贝 B (格式检测)

    DIST->>A: register → { stream, unregister() }
    DIST->>B: register → { stream, unregister() }
    Note over DIST: 活跃拷贝数 = 2

    SRC->>DIST: chunk 1
    DIST->>A: enqueue(chunk 1)
    DIST->>B: enqueue(chunk 1)

    B->>B: 读 chunk 1 → 判断格式
    B->>DIST: cancel → unregister()
    Note over DIST: 活跃拷贝数 = 1

    B-->>B: ✅ 职责结束

    loop chunks 2..N
        SRC->>DIST: chunk
        DIST->>A: enqueue(chunk)
    end

    A->>A: SHA1 计算完毕
    A->>DIST: unregister()
    Note over DIST: 活跃拷贝数 = 0 →<br/>source.reader.cancel()
    DIST-->>SRC: releaseLock()

    A-->>A: ✅ 职责结束
```

| 事件                      | 活跃拷贝数                     |
| ------------------------- | ------------------------------ |
| 分发器启动，注册拷贝 A、B | 2                              |
| B cancel → unregister     | **1**                          |
| A 消费完毕 → unregister   | **0 → source.reader.cancel()** |

任一拷贝 cancel 不影响其他。最后一个拷贝离开时源头
才被释放。这就是"全停则全停"。

## 背压

分发器不主动拉取 source。source 的推进由拷贝的消费驱动——
拷贝的 `pull()` 触发 `source.read()`，拿到 chunk 后广播给所有
活跃拷贝（各自 `enqueue`）。

慢拷贝不阻塞快拷贝——落后时走 TemporaryFileChunkReader 从磁盘回放即
可，不参与 source 推进节奏。source 的速率由整体消费节奏决定，不由分发器
预设。

背压点只有一个：`Buffer[]` 已满且上一次磁盘 flush 尚未完成时，
暂停 `source.read()`，flush 完成后恢复。即**磁盘写入带宽决定速率**。

这与传统"木桶效应"（最慢消费者决定整体速率）不同——两级存储
（内存→磁盘）切断了快慢消费者之间的耦合。快拷贝驱动 source
推进，慢拷贝从文件追赶。磁盘是它们的缓冲带，而非瓶颈。

客观上，最快拷贝的消费节奏决定了 source 推进速率。当下游选择
快速消费时，自然获得附带收益：

- **缩短连接生命周期**：TCP 连接更快进入 CLOSE 或复用状态，减少
  代理超时、客户端超时、负载均衡器断开的风险窗口
- **数据先行落盘**：数据从脆弱的网络通道尽快转移到稳定存储，
  即使后续处理出错，仍在，可重试、可审计、可恢复
- **减少攻击面**：拖着不读的连接是敞开的资源消耗点

但分发器不替下游做这个决定——它是消费节奏的自然结果，不是
分发器的预设策略。

## 依赖

零外部依赖。仅使用：

- `node:fs`（`fs.open`、`fileHandle.read`、`fileHandle.write`）
- `node:stream/web`（`ReadableStream`）
- `node:os`（`freemem`、`tmpdir`）
- `node:path`（`join`）
- `node:crypto`（`randomBytes`——临时文件名）

## 待定

### 流终止信号

source 的终止信号（done / error / destroy）对每个拷贝**延迟暴露**——
各拷贝先正常消费自己进度之后的已缓冲 chunk，耗尽后才收到对应信号。

- **source done**：`controller.close()`，消费者的 `read()` 返回
  `{ done: true }`——正常结束
- **source error**：`controller.error(err)`，消费者的 `read()` reject
  ——意外终止
- **destroy**：同 error 路径，但错误类型可辨识（如 `AbortError`），
  下游可据此区分意外终止与策略截断

这保证每个拷贝拿到的始终是连续完整前缀（不会跳号、不会缺中间块），
且"来晚了"的拷贝也能利用已缓冲数据完成部分工作。新 `register()`
亦然。

对拷贝流而言，三种终止都是"流结束了"——下游不关心原因时统一处理，
需要区分时检查 `error.name`。

### 临时文件清理

临时文件清理策略继续搁置，实现时再定。

## 已知风险与可观测性

以下风险源于"数据与 exchange 生命周期解耦"的架构取舍，模块不替
调用方做强制策略，但提供可观测性信号：

- **悬空拷贝**：后处理拷贝出错或 hang 住时，HTTP 响应已发，无 channel
  回报状态
- **磁盘空间累积**：并发请求 × 慢拷贝消费时长 × 数据量 = 峰值磁盘
  占用
- **未 unregister 导致泄漏**：消费者既没 cancel 也没调 unregister
  且持有引用不释放时，文件描述符无法回收、磁盘文件无法删除

模块通过事件机制提供感知能力：当拷贝存活时间或落后程度超过阈值
时触发 `warn` 事件。默认策略为 `console.warn`，调用方可替换为
自定义处理器（接入日志系统、监控报警等）。这是提示而非强
制——若下游确实需要长时间后处理，忽略该事件即可。

### 纯内存模式

下游在 `get highWaterMark()` 中返回 `Number.MAX_SAFE_INTEGER`
即可事实上禁用磁盘溢出。

## 可观测性

### 生命周期事件

分发过程各节点均暴露事件，下游可零侵入接入日志与监控：

| 事件                | 含义                                   |
| ------------------- | -------------------------------------- |
| `copy:registered`   | 新拷贝上线，携带 `label`               |
| `copy:done`         | 拷贝正常消费完毕，自动清理             |
| `copy:cancelled`    | 拷贝被 cancel                          |
| `copy:unregistered` | 显式调用 unregister                    |
| `source:done`       | 源流正常结束                           |
| `source:error`      | 源流出错                               |
| `all:empty`         | 所有拷贝离开，分发器释放               |
| `destroy`           | 强制销毁，拷贝耗尽已缓冲数据后 → error |

### 统计

只读 `stats` 对象，实现成本极低：

```js
distributor.stats  // →
{
  bytesBuffered,   // 当前 Buffer[] 字节数
  bytesWritten,    // 已写入磁盘总字节数
  totalChunks,     // 已处理 chunk 数
  activeCopies,    // 当前活跃拷贝数
  peakCopies,      // 历史峰值拷贝数
}
```

## 非目标

以下不在本模块的职责范围内——这些是上层调用方的职责：

- 数据大小限制和错误码语义
- HTTP method 白名单
- "已消费"标志位管理
- 框架层响应生命周期协调
- 任何协议相关逻辑
