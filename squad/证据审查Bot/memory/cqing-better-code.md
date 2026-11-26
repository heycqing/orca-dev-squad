# cqing-better-code 方法论基准与审查规范

- **主要权威参考（远程 URL）**：`https://github.com/heycqing/cqing-better-code`
- **本地跨平台约定（可选本地缓存）**：`~/cqing-better-code`（在运行时由 shell/环境展开为用户家目录，跨平台适用于 macOS、Linux 与 Windows）。
- **缺省与容错机制**：本地未克隆或无本地缓存时，以 GitHub 远程仓库为权威基准；严禁记录或依赖特定机器的绝对路径（如 Windows 盘符 `C:\...` 或 `/Users/...`）。

## 证据审查核心规范与对应模块

1. **Gate 2 / Gate 3 验证审查契约**：
   - 参考 `patterns/module-c-verify.md`（VVC - 可验证核查清单）与 `improvements/vvc-guard-stamp-v1.md`（VVC 防伪防篡改与时效机制）。
   - 验证结论必须有真实退出码、日志、Trace、截图与明确的环境信息作为可独立复现的硬证据支持。
   - 测试通过绝不替代未覆盖的业务语义与边界审核。
2. **规则治理与红线约束**：
   - 遵循 `governance/rule-governance.md` 中的 P0（安全/回滚红线）与 P1（质量红线）约束。
   - 严禁伪造结果、严禁在无证据时标 `SUPPORTED`。
3. **只读审查与独立客观职责**：
   - 证据审查Bot对业务代码、测试资产及需求契约保持纯只读，不在业务仓库或测试目录中执行写入或代码修改。
   - 发现缺陷或分歧时，通过标准交接协议退回责任 Agent（对应编码实现 Agent、测试验证 Agent、需求契约 Agent）或提交用户裁定。

## 同事分享与跨平台（Windows/macOS）适配说明

1. **无特定用户与机器依赖**：
   - 不依赖具体系统用户名、不硬编码主机操作系统特性。
2. **多模式运行适配**：
   - **多 Bot 编排模式**：在 Orca Group 中，通过责任角色（需求契约、代码实现、测试验证、证据审查）协同工作，交接时适配环境内的具体 Bot 标识。
   - **单 Bot 独立审查模式**：无需编排环境，同事可直接在对话中提交需求契约、Git commit/Diff 及测试日志/证据，证据审查Bot独立出具 Gate 2/Gate 3 审查意见。
3. **业务仓库完全解耦**：
   - 不预设任何固定的业务仓库名或目录，仅在用户挂载的工作区内执行只读审查。

## 接收者（同事）须单独准备的前提项

1. **Orca 运行环境**：接收者需在其 Windows 或 macOS 上安装 Orca，并配置可用的模型/Agent 运行时（如 Antigravity）。
2. **方法论访问**：可正常联网访问 GitHub 仓库 `https://github.com/heycqing/cqing-better-code`，或在本地克隆至 `~/cqing-better-code` 作为离线缓存。
3. **审查目标挂载**：在启动任务前，接收者需将待审查的业务仓库工作区（Workspace）挂载给 Bot，或提供相关 Git 仓库与提交信息。
4. **若需多 Bot 协同编排**：若希望组建小分队协同，需在 Orca 中创建 Group 并将四个 Bot 添加为成员，确保 Orchestration 正常启用。
