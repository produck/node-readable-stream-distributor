# ReadableStreamDistributor 设计文档

## 目标

将一个 `ReadableStream`（主入口流）分发给多个独立消费者。
每个消费者获得来源数据的完整、独立拷贝，消费进度互不影响。
当所有消费者停止消费时，主入口流自动释放。

支持内存缓存自动溢出到磁盘，chunk 边界保持一致。

## 核心语义

```text
主入口流（唯一真实来源）
  → register({ label }) → { stream, unregister() }
  → 每个拷贝流独立消费
  → 任一拷贝 cancel 不影响其他
  → 当且仅当所有拷贝都 unregister
  → 主入口流 reader.cancel() / releaseLock()
```

## API

```js
import { ReadableStreamDistributor } from '@produck/readable-stream-distributor';

const distributor = new ReadableStreamDistributor(source, {
  highWaterMark, // 内存 chunk 数阈值，超过后溢出到文件
  tmpdir: os.tmpdir(), // 临时文件目录
});

const copy = distributor.register({ label: 'sha1-checker' });
// → { stream: ReadableStream, unregister(): void }

// 正常消费
const reader = copy.stream.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
}

// 提前终止——不影响其他拷贝
copy.unregister();

// 消费者 cancel 自己的 stream 也会自动 unregister
reader.cancel();
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

    BROADCAST -- "任一拷贝满 →<br/>暂停 source.read()" --> SOURCE
    COPY_A -- "unregister" --> COUNTER{"活跃计数 -1"}
    COPY_B -- "unregister" --> COUNTER
    COUNTER -- "归零 → reader.cancel()" --> SOURCE
```

### 模块

| 模块                        | 职责                                  |
| --------------------------- | ------------------------------------- |
| `ReadableStreamDistributor` | 源流 → 多拷贝分发，引用计数，策略切换 |
| `BufferReader`              | 内存阶段——从 `Buffer[]` 按 index 读取 |
| `FileReader`                | 文件阶段——从 chunk 文件按游标读取     |
| chunk 文件格式              | `[4B len][chunk data]...` 自描述序列  |

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

## Chunk 读取器

每个拷贝持有独立的 `ChunkReader`。策略切换时替换读取器，
提前 skip 到位。

### 接口

```js
interface ChunkReader {
  read(): Promise<{ value: Uint8Array, done: boolean }>;
}
```

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
    DIST->>A: 替换读取器: BufferReader → FileReader<br/>已消费 10 个 → 不从文件回放
    DIST->>B: 替换读取器: BufferReader → FileReader<br/>只消费 2 个 → skip 前 2 个 chunk → 从 chunk 3 开始 enqueue
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

广播前检查所有拷贝的 `controller.desiredSize`。任一 ≤ 0
则暂停 `source.read()`，等 `pull` 回调唤醒。

## 依赖

零外部依赖。仅使用：

- `node:fs`（`fs.open`、`fileHandle.read`、`fileHandle.write`）
- `node:stream/web`（`ReadableStream`）
- `node:os`（`tmpdir`）
- `node:path`（`join`）
- `node:crypto`（`randomBytes`——临时文件名）

## 非目标

以下不在本模块的职责范围内——这些是上层调用方的职责：

- 数据大小限制和错误码语义
- HTTP method 白名单
- "已消费"标志位管理
- 框架层响应生命周期协调
- 任何协议相关逻辑
