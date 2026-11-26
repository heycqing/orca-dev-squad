# cqing-better-code Methodology Integration

- **Primary Repository URL**: `https://github.com/heycqing/cqing-better-code`
- **Cross-Platform Local Convention**: `~/cqing-better-code` (expanded to `$HOME/cqing-better-code` on macOS/Linux and `%USERPROFILE%\cqing-better-code` on Windows)
- **Local Fallback Strategy**:
  1. Check if `~/cqing-better-code` exists locally.
  2. If missing, clone via `git clone https://github.com/heycqing/cqing-better-code ~/cqing-better-code` or access via GitHub URL.
  3. Never hardcode machine-specific absolute paths (e.g. `C:\Users\Administrator\...` or `/Users/username/...`).
- **Key Modules**:
  - `governance/rule-governance.md`: P0 (Safety/Rollback), P1 (Quality/Fix before finish), P2 (Preference) rules.
  - `rules.json`: Machine-executable rule registry and detection tiers (L0/L1/L2).
  - `patterns/`:
    - `module-a-constraint.md`: CBDA + SEL + BER + Blocking protocols.
    - `module-b-batch-migration.md`: Pattern-first batch migration protocol.
    - `module-c-verify.md`: VVC (Verifiable Verification Checklist) gate.
    - `module-d-pipeline.md`: Modular pipeline workflow.
  - `workflow.md`: AI collaboration and session lifecycle protocols.
  - `ONBOARDING.md`: Protocol for attaching the methodology to any target business repository.
- **Key Improvements & Anti-Patterns**:
  - `improvements/fake-prop-assertion-anti-pattern-v1.md` (改进 #19): 禁止在虚拟 DOM 单测中以组件属性传递假断言冒充视觉/布局正确；纯布局任务无纯数据逻辑时显式声明留空（Explicit Test Gap）流转给跨端真实浏览器 E2E 验证，消除测试遮蔽效应。
  - P1 规则: `no-fake-visual-assertion` (禁止伪视觉断言与显式留空)
  - 研发测试小分队协议: `v1.2` (SHA-256: `DF28E4B98A1D61B30B73D297DE0C3B28BC5445DCA895818F3D7F130B59348474`)
