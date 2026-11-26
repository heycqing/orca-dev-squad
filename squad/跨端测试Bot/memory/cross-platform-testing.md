# 跨端测试与 IDT/Midscene 可移植接入规则

## 1. 跨端测试通用架构与工程自发现规则（可移植规范）

- **IDT Engine**：
  - **规范基准**：以 GitHub 远程仓库为主要规范基准：`https://github.com/heycqing/idt-engine`。
  - **本地缓存约定**：`~/idt-engine` 仅作为可选全局离线缓存，未克隆时直接以 GitHub 仓库为准。
  - **工程自发现**：不预设外部固定路径。在具体业务工程中，优先通过工程自身的配置进行自发现，如项目根目录的 git submodule（如 `idt-engine`）、`package.json` 中的 `scripts`（如 `tsx ./idt-engine/scripts/idt/cli.ts verify`）或 npm/pnpm 依赖。
- **Midscene**：
  - **规范基准**：以官方开源仓库与文档为主要参考：`https://github.com/web-infra-dev/midscene`。
  - **工程自发现**：依赖目标工程自身的包管理器依赖（如 `@midscene/web`）与运行时配置；禁止假设固定的网关或模型名。
  - **环境配置自发现**：从当前工作区或工程根目录就近查找本地私有环境变量配置文件（如 `.env.local`、`.env.test` 或工程约定的环境文件），或直接读取宿主环境变量；支持脱敏与只读保护。
- **凭证与配置隔离原则**：
  - **严禁预设特定凭证文件**：禁止假设固定的凭证文件名（如 `账号密码.md`）或特定券商/业务变量（如 `CAIDA_*`）。测试凭证应由使用者在目标项目的私有环境文件或自定义环境变量中提供。
  - **测试安全白名单**：执行任何涉及写入或交易的动作前，必须明确校验当前 URL 处于非生产域名/主机白名单内（严禁在生产或未知环境直接执行）。
  - **跨平台绝对路径禁令**：配置、脚本、用例与证据中一律禁止硬编码特定机器专属的操作系统绝对路径（如 `C:\Users\...` 或 `/Users/...`）。
- **协同与角色解耦**：
  - 支持单 Bot 独立工作或在多 Bot 编排环境中协同。测试执行面向角色（研发实现角色、证据审查角色、协调角色），不硬编码特定 Bot 名称。

## 2. 历史样本参考（原作者仓库 trade-monorepo）

> [!IMPORTANT]
> **历史参考样本声明**：
> 本章节记载的所有内容（包括特定券商测试用例、AVD Pixel 模拟器、HDC、WDA、Sub2API 接口等）仅为原作者在特定历史工程（`trade-monorepo` @ `chore/teste2e`）上的单一落地实测样本，**绝非通用默认，更不是同事机器或新业务工程的默认状态**。当同事在自己的机器上运行本 Bot 时，严禁将历史凭证、特定模拟器型号或历史通过记录当作当前项目的上下文，必须在目标项目上重新执行命令并产出现场硬证据。

### 历史参考证据与执行入口
1. **IDT 离线质量闸门（历史阶段记录）**：
   - **对应提交与日期**：commit `39c4434c`（2026-11-20），对应基线 `42338b01`（2026-11-03）与闸门阶段（2026-11-02）。
   - **可复核证据文档**：
     - `docs/idt-evidence-goal.md`（章节“严格质量闸门阶段记录（2026-11-02）”与“IDT × Midscene 主流程阶段记录（2026-11-03）”）
     - `docs/idt-quality-debt.md`（质量债务与退役清单）
   - **执行命令**：`node_modules/.bin/tsx ./idt-engine/scripts/idt/cli.ts verify --strict`
   - **历史记载结果**：75 对活动 IR/spec 配对完整，退出码为 0（0 错误、0 未豁免警告、1 条精确豁免警告：`kaiyuan/flow_8e321313ee/weak-assertion` 用于 M3 变异阴性对照）；spec 重算逐字节一致。
   - **引擎单元测试说明**：历史文档曾分别在基线 `42338b01` 记录 537/537 通过、在更早基线记录 533/533 通过；此为历史文档在不同提交时的记录值，未在新环境现场运行，在新机器上必须通过目标工程的测试命令重新执行并以现场退出码为准。

2. **Web 交易闭环与移动端渲染（历史阶段记录）**：
   - **对应提交与日期**：commit `39c4434c`（2026-11-20）
   - **可复核证据文档与用例**：
     - `apps/caida/tests/e2e/test-case-catalog.md`
     - `docs/superpowers/plans/2026-11-03-caida-real-environment-multiplatform-testing.md`
     - 用例代码：`apps/caida/tests/e2e/real-env/specs/web-trade-loop.spec.ts`、`apps/caida/tests/e2e/real-env/specs/android-render.spec.ts`
     - 驱动测试：`apps/caida/tests/e2e/real-env/tests/*.test.ts`
   - **历史记载结果**：在特定本地开发服务与 AVD 模拟器环境下的历史通过记录；在新环境必须在确认非生产环境与模拟器就绪后重新跑出证据。

3. **基础设施历史环境事实（非跨机器默认状态）**：
   - **HarmonyOS HDC 实机**：驱动实现位于 `apps/caida/tests/e2e/real-env/drivers/harmony-hdc.ts`；历史记录标 `SKIP` 仅因当时该机器 `hdc list targets` 为空，属于历史环境事实。若新机器连接真实鸿蒙设备，应通过对应自检脚本重新探测，严禁默认无设备。
   - **iOS Remote WDA**：驱动实现位于 `apps/caida/tests/e2e/real-env/drivers/ios-wda.ts`；历史记录标 `SKIP` 仅因当时机器未配置 `IOS_WDA_URL` 远程 Mac 节点，不可作为跨机器默认假设。
   - **真实 Midscene 线上观察**：主流程静态 fixture 验证见 `docs/superpowers/plans/2026-11-02-idt-midscene-main-flow.md`，真实调用受阻记录见 `docs/idt-midscene-deepseek-report.md`。真实 LLM observe 依赖外部模型网关响应与业务状态变化，在新环境下必须重新配置并执行探针。
   - **CI 流水线 Runner**：历史记录见 `docs/idt-evidence-goal.md`（“项目目前没有任何可用 runner”），仅代表该业务工程特定阶段的基础设施现状，不代表其他工程或未来的 CI 状态。

## 3. 同事（接收者）跨平台运行独立准备清单

同事在自己的 Windows / macOS 机器上运行本 Bot 时，需按需准备以下工具、权限、连接与设备：

### 1. 基础开发工具与运行时环境
- **Node.js**：建议 LTS 版本（Node 18 或 20 以上），及匹配的包管理器（`pnpm` / `npm` / `yarn`）。
- **Git CLI**：具备拉取目标工程及其子模块（submodule）的权限与配置。
- **Playwright 浏览器内核**：若执行 Web 端验收或 UI 自动化，需在本地安装 Chromium 内核：
  ```bash
  npx playwright install chromium
  ```
- **操作系统命令执行权限**：确保在当前终端具备运行测试脚本、启动本地开发服务器的权限。

### 2. 凭证与 AI 模型连接（按需配置）
- **Midscene 视觉模型 API**：若需使用智能探索驱动，需在本地配置兼容的视觉模型端点与 API Key（如 OpenAI-compatible 视觉模型、通义千问视觉版或团队私有视觉模型网关），并在项目的私有环境文件（如 `.env.local`）中登记。
- **业务测试账号与非生产环境**：
  - 准备目标工程可用的非生产测试账号与密码。
  - 确保本地或联调测试服务连通（如 `http://localhost:<port>`），并配置主机操作白名单，严禁直连生产环境。

### 3. 多端设备与驱动（按目标项目验收要求准备）
- **Android 跨端验收**：
  - 安装 Android Studio 及 Android SDK `platform-tools`（确保 `adb` 命令在系统 PATH 中）。
  - 创建并能启动 AVD 模拟器，或使用 USB 数据线连接开启了开发者模式与 USB 调试的真实 Android 设备。
- **HarmonyOS 跨端验收**：
  - 安装 DevEco Studio，将 `hdc` 命令行工具加入系统 PATH。
  - 通过 USB 连接 HarmonyOS 真机或开发板，并开启开发者调试模式。
- **iOS 跨端验收**：
  - iOS 真实渲染需在 macOS 机器上运行 Xcode 及 WebDriverAgent (WDA) Runner 服务。
  - Windows 环境下不可直接启动本地 iOS 模拟器，需通过局域网连接远端 Mac 并配置 `IOS_WDA_URL`（如 `http://<mac-ip>:<port>`）。
