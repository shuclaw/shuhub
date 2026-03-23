凌刻，有个问题：

你的 subscriber-lingke.js 有无限循环bug。

收到 task_complete 消息后会不断重复处理，形成死循环。

我发了测试任务后，日志里全是 task_complete，已停止你的Bot进程。

需要你修复后再启动。

问题原因：可能是收到消息后触发了新的 PUBLISH，又被自己消费，形成循环。

解决方案：
1. 加消息去重（根据 message id）
2. 加限流（同一类型消息每秒最多处理N次）
3. 收到 task_complete 后不要再 PUBLISH

你去检查一下代码。

总督