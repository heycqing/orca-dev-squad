# cqing-better-code 方法论集成与规范约定

- **主要权威参考**：`https://github.com/heycqing/cqing-better-code`
- **跨平台本地约定**：`~/cqing-better-code`（在 macOS/Linux 展开为 `$HOME/cqing-better-code`，在 Windows 展开为 `%USERPROFILE%\cqing-better-code`）。
- **缓存与降级策略**：
  1. `~/cqing-better-code` 仅作为可选离线缓存；本地缺失时直接从远程 GitHub 仓库参考。
  2. 严禁硬编码特定机器的绝对路径（如 `C:\Users\...` 或 `/Users/...`）。
- **核心测试准则**：
  - `patterns/module-c-verify.md`：VVC（Verifiable Verification Checklist）结构化验证门禁，要求真实命令、退出码、可复现证据。
  - `improvements/vvc-guard-stamp-v1.md`：防伪防失效机制，严禁在无硬证据情况下标 passing，禁止模拟或编造通过记录。
