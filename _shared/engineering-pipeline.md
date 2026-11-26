# 研发测试小分队：共同交付协议 v1.4

适用角色：需求契约、代码实现、跨端测试、证据审查。本文是每项任务开始时要读取的共同规则；任务自身已批准的需求契约决定业务正确性。

每个 Bot 在承接一项新任务时，先实际读取此文件并计算文件 SHA-256。在首次公开回复或显式交接中写出 `协议版本: v1.4`、`协议 SHA-256`、本任务的 `task_id`、当前阶段、自己负责的产物、禁止自行推进的下一道门。不能仅凭记忆复述协议版本；无法读取文件时报告 `BLOCKED`，不继续流转。需求契约 Bot 在任务账本的首条事件中记录四个角色的协议确认；缺任一必要角色的确认，不把流程标为已经完成交接。协议摘要只能证明读到了同一份文件，是否遵守仍须看后续行为与门禁证据。

## 唯一任务状态

每个任务以 `task_id` 识别，只在任务账本中记录状态：`REQUIREMENTS_PROPOSED → REQUIREMENTS_APPROVED → IMPLEMENTING → READY_FOR_TEST → READY_FOR_REVIEW → AWAITING_HUMAN_GATE3 → COMPLETED`。失败或证据缺失时记 `BLOCKED` / `INSUFFICIENT`，保留原因。群聊发言、Bot 记忆和 handoff 回执都不能单独推进状态。

任务账本存于目标工程的 `docs/plan/<任务目录>/pipeline.json`，可从本目录的 `task-ledger.template.json` 起草；无可写工程时先在群内给出账本草案，不自行另建全局状态库。需求契约 Bot 是唯一状态写入者；其他 Bot 只通过显式交接提供证据，审查 Bot 只读。需求契约 Bot 仅在核对接收方结果或人类明确裁定后更新状态，不凭发送回执推进。`COMPLETED` 只能依据人类针对具体版本的批准原文记录。

任务账本至少记录：`task_id`、`contract_version`、已批准范围、代码 commit 或完整 Diff 标识、环境、逐条 AC 的验证域与结果、原始命令及退出码、运行日志/Trace/目标会话回执、未解决项、当前责任人、人类裁定原文。代码或契约版本变化后，相关测试与审查结论失效。

## 交接与隔离

- 同一文件同一时刻只有一个写入责任角色。编码与测试资产若同时写入，使用独立工作区或明确文件所有权；审查角色只读。
- 工作转交使用 Orca 显式 `handoff`，标明任务、版本、接收者和目标 chat。群聊中的普通 `@` 文本不是交接。
- Orca 消息 ID 只证明发送被接受。接收 Bot 对该任务的确认与实际产物另行记录；跨群投递必须核对目标会话，不用发送方的自述代替接收方证据。
- 同一缺陷自动退回两轮仍未解决，停止循环，交人裁定。

## 验证与裁定：三层闭环标准（Three-Layer Verification Closure）

v1.4 借鉴 **Storybook《UI Testing Handbook》测试分层**、**ReDeCheck（ISSTA 2017）无基准图几何失效分类** 与 **VLM（多模态大模型）GUI 视觉能力边界**，将前端一切改造与验收条件收敛为互斥且互补的**三层闭环标准**，彻底分离“逻辑正确”、“视觉排版正确”与“端到端业务回归正确”：

### 第一层：逻辑与状态域（`STATE_LOGIC`）
- **理论基准**：Storybook Functional / Interaction Testing。
- **范围**：纯函数算法、数据转换、Store 状态跃迁、计算属性、事件 Payload、条件分支、权限判定、空态与降级回退等不依赖浏览器渲染引擎的纯内存逻辑。
- **必需证据（`UNIT_TEST`）**：由单元测试 / 组件单测（Vitest / Jest）在 **Gate 2** 毫秒级白盒闭环。
- **反作弊红线（改进 #19）**：虚拟 DOM（jsdom）无排版渲染引擎，**严禁在单测中通过 stub/mock 组件属性（如 `data-centered`、`wrap-class-name`、`body-style`）进行伪布局断言**。

### 第二层：空间布局与视觉域（`VISUAL_LAYOUT`）
- **理论基准**：Storybook Visual Testing + **ReDeCheck（ISSTA 2017）** Responsive Layout Failures + **VLM 视觉边界**（如 GUI Knowledge Bench）。
- **范围**：任何影响二维屏幕空间占位、排版流（Reflow）、弹窗居中、长文本折行、列宽分配或视口滚动的变动（包括 `*.vue`、`*.tsx`、`*.jsx`、`*.css/.scss/.less`、表格列 `columns`、表单 schema 等）。
- **ReDeCheck 四类必须核验的几何失效项**：
  1. **Overflow（溢出与撑裂）**：`scrollWidth <= clientWidth`，元素/容器不超出父容器与视口边界，长文本/超长 URL 正常折行，右侧操作按钮不被挤出视口。
  2. **Overlap（重叠与遮挡）**：元素之间无非预期碰撞重叠，关闭按钮、提示角标或浮层不压盖标题与正文内容。
  3. **Incongruous Wrapping / Alignment（异常折行与对齐错位）**：视口/容器居中对称误差在阈值内（`boundingBox`），多断点响应式换行顺序与对齐稳定。
  4. **Scroll Isolation（滚动独立性）**：`max-height` 约束生效，长内容触发独立垂直滚动（`scrollHeight > clientHeight`），且不发生主页面穿透滚动（`window.scrollY` 保持稳定）。
- **VLM 多模态视觉边界（双通道互补，禁止越界代偿）**：
  - **定量几何归引擎（`BROWSER_GEOMETRY`）**：像素居中误差、最大宽度、溢出差值、`scrollHeight` 等精确数值**必须由真实浏览器 Playwright DOM 盒模型测量得出**；**禁止用 VLM 看图“目测估算像素”替代几何断言**。
  - **定性体验归 VLM（`MULTIMODAL_VISUAL`）**：排版拥挤违和、文字截断/乱码、视觉层次与可读性、轻微遮挡等难以用公式穷举的软性缺陷，**由高保真截图（PNG）交由多模态视觉审阅（开发自测可先用 VLM 预检，跨端测试与人工终审复核）闭环**。
- **落地时机**：编码 Bot 在 Gate 2 必须对本域声明单测 `SKIPPED_BY_DESIGN` 并登记 `unresolved_gaps`；**鼓励编码 Bot 在开发自测阶段提前跑通局部浏览器几何+VLM 看图自检**，但正式门禁证据仍须在 Gate 3 前置由独立浏览器环境复核落账。

### 第三层：端到端业务回归域（`FLOW_REGRESSION`）
- **理论基准**：Storybook User Flows + 基于 Diff 影响面的回归测试选择（Impact-based E2E Regression）。
- **范围**：
  1. **完整用户旅程（Core User Journey）**：跨组件、跨路由、前后端契约/Mock 或真实联调链路（如：任务页打开资料弹窗 → 复制深链 → 访问合作方工作台深链校验权限与数据落地）。
  2. **影响面存量回归（Impacted Existing Specs）**：根据本次 Git Diff 修改的公共组件、业务面板或路由，检索并回归仓库 `e2e/` 中所有受影响的存量 `.spec.ts` 用例，确保“修好新问题且未破坏老流程”。
- **必需证据（`E2E_REGRESSION`）**：由 **跨端测试 Bot** 在 **Gate 3 前置** 执行并产出完整命令、退出码、通过计数与 Trace/截图；不得只跑单条局部几何测试就宣称 E2E 闭环。

### 双锁协同与显式留空机制（Double Insurance）
- **程序客观识别锁（底线）**：探针 `check-verification-domain.mjs` 检查 Git Diff：
  - 若改动了视图/样式层文件，强制要求出具 `VISUAL_LAYOUT`（`BROWSER_GEOMETRY` + `MULTIMODAL_VISUAL`）与受影响范围的 `FLOW_REGRESSION`（`E2E_REGRESSION`）证据；
  - 若扫描到单测存在伪布局断言（改进 #19），探针直接退出码非 0 阻断。
- **AI 意图理解锁（决策）**：编码 Bot 涉及 `VISUAL_LAYOUT` 时坚决不在单测写假断言，在 Gate 2 显式声明留空（`unresolved_gaps`）并标明需要跨端测试 Bot 核验的 ReDeCheck 检查项与影响面回归集。
- **审查 Bot 终审把守**：审查 Bot 独立对照账本与代码版本：
  - 若存在 `VISUAL_LAYOUT` 改动但缺少真实浏览器 `BROWSER_GEOMETRY` 或缺少多模态视觉截图证据；
  - 或仅跑了局部视觉几何用例却漏跑受影响的存量 E2E 回归 / 核心业务流（`E2E_REGRESSION`）；
  - 或存在单测假断言 / 未闭环留空（`unresolved_gaps`）；
  **强制判定为 `INSUFFICIENT`**，绝对阻断合入。
- `继续`、`收到`、`先运行看看`、对其他 Gate 的批准都不是 Gate 3 批准。只有人类针对明确 `task_id`、`contract_version`、`code_revision`、目标环境和动作说出批准，才可记录相应裁定。发布或上线需另列动作，不从 Gate 3 推导。

## 完整协同流转全景图（Standard Pipeline Flow）

```text
[人类提出需求 / 缺陷 Bug]
       │
       ▼
【Gate 1: 需求契约Bot】
  • 读取共同协议 v1.4 并对齐指纹 (SHA-256)
  • 起草结构化任务账本 pipeline.json：将 AC 按三层闭环标准归域
    - 第一层 STATE_LOGIC:     required="UNIT_TEST"
    - 第二层 VISUAL_LAYOUT:   required="BROWSER_GEOMETRY + MULTIMODAL_VISUAL"
      (明确 ReDeCheck 四类核验项：Overflow / Overlap / Wrapping&Alignment / ScrollIsolation)
    - 第三层 FLOW_REGRESSION: required="E2E_REGRESSION"
      (明确核心用户旅程 + 受变更影响的存量 E2E 回归范围)
  • 人类审阅并下达指令批准 Gate 1: "APPROVED"
       │
       ▼ (显式 Handoff)
【Gate 2: CqingCodeBot / agyBot (编码角色)】
  • 修复业务代码（逻辑层 / 视图与样式层）
  • 实施三层决策分流：
    - 对 STATE_LOGIC: 编写 100% 纯逻辑/交互单测，毫秒级闭环
    - 对 VISUAL_LAYOUT: 坚决不写 mock 属性假单测；声明 unit_test="SKIPPED_BY_DESIGN"
      (鼓励本地用 Playwright 几何 + VLM 看图自检排雷，但不替代 Gate 3 独立核验)
    - 在 unresolved_gaps 中挂载 VISUAL_LAYOUT 与 FLOW_REGRESSION 留空（指派 bot:跨端测试Bot）
  • 运行探针 check-verification-domain.mjs 自查（无假断言 + 获取受影响存量 E2E 建议清单）
  • 发送 Handoff 给跨端测试Bot，状态推进至 READY_FOR_TEST
       │
       ▼ (显式 Handoff)
【Gate 3 前置: 跨端测试Bot】
  • 读取账本中的 unresolved_gaps 清单与探针输出的影响面 E2E 清单
  • 在真实多端浏览器内核 (Playwright Chrome / Edge 等) 中完成两项硬核验证：
    1) VISUAL_LAYOUT 闭环：
       - 定量测量 ReDeCheck 四类几何指标 (boundingBox 对称度、scrollWidth 防溢出、重叠检查、scrollHeight 独立滚动)
       - 采集高保真全屏/局部截图 (PNG) 并完成 VLM/多模态视觉审阅结论（确认无遮挡、截断、挤压违和）
    2) FLOW_REGRESSION 闭环：
       - 执行核心用户旅程端到端用例（跨组件/跨路由/状态落地）
       - 执行受本次 Diff 影响的存量 E2E 回归用例集，确认零回归破坏
  • 回写 metrics、vlm_visual_review 与 impacted_e2e_specs，将 gap 标记 resolved: true，AC 推进为 PASSED
  • 发送 Handoff 给证据审查Bot，状态推进至 READY_FOR_REVIEW
       │
       ▼ (显式 Handoff)
【Gate 3 审查: 证据审查Bot】
  • 独立复核并调用探针 node ../_shared/check-verification-domain.mjs
  • 核验三层闭环证据齐全：
    - STATE_LOGIC -> UNIT_TEST 通过且无改进 #19 假断言
    - VISUAL_LAYOUT -> BROWSER_GEOMETRY 数值指标 + MULTIMODAL_VISUAL 截图与审阅结论齐全
    - FLOW_REGRESSION -> 核心旅程 + 受影响存量 E2E 回归全部执行且通过
    - unresolved_gaps 为 0
      ⚠️ 任一层缺失或存疑: 强制判定 INSUFFICIENT (阻断合并)
      ✅ 三层全部真实闭环且探针通过: 出具结论 SUPPORTED
       │
       ▼
【Gate 3 终审: 人类决策者】
  • 人类审阅几何实测数据、视觉截图与 E2E 回归报告
  • 人类下达指令明确批准: "pass gate3"
  • 任务状态正式流转至 COMPLETED，准予分支合并与发布
```
