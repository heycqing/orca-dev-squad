# Orca 研发测试小分队协同交付配置库 (Protocol v1.4)

> 适用系统：**macOS** / **Windows** / **Linux**  
> 运行环境：[Orca AI Agent Workstation](https://orca.ai)

本仓库独立归档了 Orca「研发测试小分队」的**小组协作约束底座（_shared）**与 **4 个核心角色 Bot**。任何使用 macOS 或 Windows 的研发与测试团队成员，均可通过本仓库在本地一键初始化与订阅更新最新协议。

---

## 一、小分队架构与核心角色

研发测试小分队基于 **交付协议 v1.4** 运转，强制推行「状态机隔离、三层正交验证闭环、无主观结论只认原始证据」的防伪机制。

```
[ Gate 1: 需求契约 ] ──handoff──> [ Gate 2: 代码实现 ] ──handoff──> [ Gate 3: 跨端测试与只读审查 ]
  需求契约Bot                        CqingCodeBot                       跨端测试Bot & 证据审查Bot
```

| 角色 Bot 名称 | 负责阶段 / 门禁 | 核心职责与边界 |
| :--- | :--- | :--- |
| **`需求契约Bot`** | **Gate 1** 需求准入 | 拆解需求契约、将 AC 严格归域（`STATE_LOGIC` / `VISUAL_LAYOUT` / `FLOW_REGRESSION`）、写入结构化唯一任务账本。无明确人类授权绝不标为 `APPROVED`。 |
| **`CqingCodeBot`** | **Gate 2** 代码工程 | 业务代码实现、纯逻辑单元测试、本地预检；严格将视觉与影响面留空交付后续角色，杜绝越权伪造。 |
| **`跨端测试Bot`** | **Gate 3 前置** 跨端实测 | 驱动真实环境、ReDeCheck 几何重叠探针、VLM 多模态视觉断言、主流程端到端自动化测试。 |
| **`证据审查Bot`** | **Gate 3** 独立核验 | 只读审查三层证据链与断言探针；严格比对 Commit ID，缺核心端到端凭证一票否决。 |
| **`提交整理Bot`** *(可选)* | 合并前整理 | 依托 `commit-curator` 技能拆分混杂提交、原子化整理 Git 提交历史。 |

---

## 二、首次安装与初始化（跨平台）

无论在 **macOS** 还是 **Windows**，只需 3 步即可完成装配：

### 第 1 步：克隆本仓库到本地

```bash
git clone https://github.com/heycqing/orca-dev-squad.git
cd orca-dev-squad
```

### 第 2 步：在 Orca 中新建 4 个成员 Bot

打开 Orca 桌面端，点击「新建 Bot」，依次创建以下 4 个 Bot（**名称必须严格一致**，底层推理引擎推荐选择 `Antigravity` 或 Claude）：
1. `需求契约Bot`
2. `CqingCodeBot`
3. `跨端测试Bot`
4. `证据审查Bot`
5. *(可选)* `提交整理Bot`

> 💡 **提示**：此时刚新建的 Bot 都是空白的，无需手动配置提示词。

### 第 3 步：运行一键同步脚本

#### 🍏 macOS / Linux 用户：
打开终端运行：
```bash
chmod +x sync.sh
./sync.sh
```

#### 🪟 Windows 用户：
打开 PowerShell 运行：
```powershell
.\sync.ps1
```

*(通用 Node.js 方式，任何装有 Node 的系统均可执行：`node sync.mjs`)*

脚本会自动扫描本机 `~/.orca/bots` 目录，将：
- `_shared/` 共同协议（`engineering-pipeline.md` 等）复制到 `~/.orca/bots/_shared/`
- 各角色的 `SOUL.md`、方法论记忆及专属技能精准注入各自的 Bot 目录。

---

## 三、日常协同与一键更新

### 1. 其他用户订阅拉取最新更新（Downstream Update）
当仓库管理者或作者升级了交付协议（如从 v1.4 升级到 v1.5）或优化了某个 Bot 的提示词后，其他用户只需拉取并重新执行一行命令：

* **macOS / Linux**：
  ```bash
  git pull && ./sync.sh
  ```
* **Windows**：
  ```powershell
  git pull; .\sync.ps1
  ```

### 2. 本地调试优化后反向采集回仓库（Upstream Capture）
如果你在 Orca 界面或本地测试中调整了某个 Bot 的 `SOUL.md`，希望反向回写到 Git 仓库提交：

* **macOS / Linux**：
  ```bash
  ./sync.sh --capture
  git status
  git commit -am "feat: 优化证据审查Bot规则"
  git push origin main
  ```
* **Windows**：
  ```powershell
  .\sync.ps1 -Mode CaptureFromLocal
  git status
  git commit -am "feat: 优化证据审查Bot规则"
  git push origin main
  ```

---

## 四、仓库目录结构

```text
orca-dev-squad/
├── .gitignore
├── README.md                           # 本指南
├── sync.sh                             # macOS / Linux 一键同步脚本
├── sync.ps1                            # Windows PowerShell 一键同步脚本
├── sync.mjs                            # Node.js 跨端同构同步脚本
├── _shared/                            # 小分队共享底座
│   ├── engineering-pipeline.md         # 交付协议 v1.4 (核心状态机与门禁红线)
│   ├── check-verification-domain.mjs   # 验证域与伪断言自动探针
│   ├── task-ledger.template.json       # 任务账本 pipeline.json 标准模板
│   ├── protocol-smoke-task.md          # 协议冒烟任务
│   ├── 测试防伪规约与两大正交验证领域（Protocol v1.3）架构演进总结报告.md
│   └── 研发测试小分队交付协议演进对比报告（v1.0至v1.4）.md
├── squad/                              # 各角色 Bot 配置资产
│   ├── 需求契约Bot/
│   │   └── SOUL.md
│   ├── CqingCodeBot/
│   │   ├── SOUL.md
│   │   └── memory/
│   │       └── cqing-better-code.md
│   ├── 跨端测试Bot/
│   │   ├── SOUL.md
│   │   └── memory/
│   │       ├── cqing-better-code.md
│   │       └── cross-platform-testing.md
│   ├── 证据审查Bot/
│   │   ├── SOUL.md
│   │   └── memory/
│   │       └── cqing-better-code.md
│   └── 提交整理Bot/
│       └── SOUL.md
└── skills/                             # 专属技能包
    └── commit-curator/
        └── SKILL.md
```
