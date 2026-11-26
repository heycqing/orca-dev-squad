#!/usr/bin/env node
/**
 * check-verification-domain.mjs
 *
 * 研发测试小分队 共同协议 v1.4 核心检查工具：
 * 基于“三层闭环标准 (STATE_LOGIC / VISUAL_LAYOUT / FLOW_REGRESSION)”
 * （Storybook 测试分层 + ReDeCheck 几何失效分类 + VLM 视觉边界）
 * 机械化核验代码变更、杜绝单测伪断言，并自动识别受影响的存量 E2E 回归范围。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const CWD = process.cwd();

// 1. 获取 Git Diff 涉及的文件
function getChangedFiles(baseRef = 'HEAD~1') {
  const target = process.argv[2] || baseRef;
  try {
    const output = execSync(`git diff --name-only ${target}`, { encoding: 'utf-8', cwd: CWD });
    return output.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    try {
      const output = execSync('git status --porcelain=v1', { encoding: 'utf-8', cwd: CWD });
      return output
        .split('\n')
        .map(line => line.substring(3).trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}

function isTestOrDocFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.startsWith('e2e/') ||
    normalized.startsWith('docs/')
  );
}

// 2. 判定文件是否属于“空间布局与视觉域 (VISUAL_LAYOUT)”
function isVisualLayoutFile(filePath) {
  if (isTestOrDocFile(filePath)) return false;

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();

  // A. 视图与样式扩展名
  if (['.vue', '.jsx', '.tsx', '.css', '.less', '.scss', '.sass'].includes(ext)) {
    return true;
  }

  // B. 影响表格列、表单布局的配置文件
  if (baseName.includes('column') || baseName.includes('tableconfig') || baseName.includes('formschema')) {
    return true;
  }

  // C. 内容级扫描（JS/TS 中定义了表格列 columns 数组或 CSS Grid/Flex 布局结构）
  const fullPath = path.resolve(CWD, filePath);
  if (fs.existsSync(fullPath) && (ext === '.ts' || ext === '.js')) {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (/columns\s*:\s*\[|grid-template|flex-basis/i.test(content)) {
        return true;
      }
    } catch {
      // ignore read errors
    }
  }

  return false;
}

// 3. 静态扫描单测文件中的“属性传递假断言（改进 #19 反例）”
const FAKE_ASSERTION_PATTERNS = [
  { pattern: /expect\(.*\.attributes\(['"]data-centered['"]\)\)\.toBe/i, desc: '断言 data-centered 属性伪居中' },
  { pattern: /expect\(.*\.attributes\(['"]data-body-max-height['"]\)\)\.toBe/i, desc: '断言 data-body-max-height 属性伪滚动' },
  { pattern: /expect\(.*\.props\(['"]centered['"]\)\)\.toBe/i, desc: '断言 props.centered 伪居中' },
  { pattern: /expect\(.*\.wrapClassName.*\)\.toContain\(['"]work-modal['"]\)/i, desc: '断言 wrapClassName 样式类名' },
  { pattern: /expect\(.*\.classes\(\)\)\.toContain\(['"]material-reader__copy['"]\)/i, desc: '仅断言 CSS class 伪存在' },
  { pattern: /expect\(.*\.attributes\(['"]style['"]\)\)\.toContain\(/i, desc: '在 jsdom 中直接断言内联 style 字符串替代真实排版验证' },
];

function scanFakeAssertions(changedFiles) {
  const violations = [];
  const unitTestFiles = changedFiles.filter(f => {
    const norm = f.replace(/\\/g, '/').toLowerCase();
    return (norm.includes('.test.') || norm.includes('.spec.')) && !norm.startsWith('e2e/');
  });

  for (const testFile of unitTestFiles) {
    const fullPath = path.resolve(CWD, testFile);
    if (!fs.existsSync(fullPath)) continue;

    const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      for (const rule of FAKE_ASSERTION_PATTERNS) {
        if (rule.pattern.test(line)) {
          violations.push({
            file: testFile,
            line: idx + 1,
            code: line.trim(),
            reason: rule.desc,
          });
        }
      }
    });
  }

  return violations;
}

// 4. 基于 Git Diff 影响面检索受影响的存量 E2E 用例 (FLOW_REGRESSION)
function findImpactedE2ESpecs(sourceFiles) {
  const e2eDir = path.resolve(CWD, 'e2e');
  if (!fs.existsSync(e2eDir) || sourceFiles.length === 0) {
    return [];
  }

  // 提取改动文件的符号/模块关键词与模板 data-* 锚点
  const keywords = new Set();
  for (const file of sourceFiles) {
    const stem = path.basename(file, path.extname(file));
    if (stem && stem.length >= 4 && !['index', 'types', 'utils', 'style', 'styles'].includes(stem.toLowerCase())) {
      keywords.add(stem);
      // 同时拆分驼峰或连字符生成短检索词（如 TaskMaterialPanel -> task-material / MaterialReader）
      const kebab = stem.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      if (kebab !== stem.toLowerCase()) {
        keywords.add(kebab);
      }
    }

    // 扫描改动 Vue/TS 文件中的 data-action / data-field / data-section 锚点
    const fullPath = path.resolve(CWD, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const attrMatches = content.matchAll(/data-(?:action|field|section)=["']([a-z0-9_-]{5,})["']/gi);
        for (const m of attrMatches) {
          keywords.add(m[1]);
        }
      } catch {
        // ignore
      }
    }
  }

  if (keywords.size === 0) return [];

  const e2eFiles = fs
    .readdirSync(e2eDir)
    .filter(name => name.endsWith('.spec.ts') || name.endsWith('.spec.js'));

  const impacted = [];
  for (const specName of e2eFiles) {
    const specPath = path.join(e2eDir, specName);
    let content = '';
    try {
      content = fs.readFileSync(specPath, 'utf-8');
    } catch {
      continue;
    }
    const matched = [];
    for (const kw of keywords) {
      if (content.includes(kw)) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      impacted.push({
        spec: `e2e/${specName}`,
        matchedKeywords: matched.slice(0, 4),
      });
    }
  }

  return impacted;
}

// 5. 执行综合核验
console.log('════════════════════════════════════════════════════════════════');
console.log('  研发测试小分队：三层闭环标准自动化核验探针 (Protocol v1.4)   ');
console.log('════════════════════════════════════════════════════════════════\n');

const files = getChangedFiles();
console.log(`[1] 正在分析改动文件 (共 ${files.length} 个)...`);

const visualLayoutFiles = files.filter(isVisualLayoutFile);
const stateLogicFiles = files.filter(f => !isVisualLayoutFile(f) && !isTestOrDocFile(f));
const testFiles = files.filter(f => {
  const n = f.replace(/\\/g, '/').toLowerCase();
  return n.includes('.test.') || n.includes('.spec.') || n.startsWith('e2e/');
});
const docFiles = files.filter(f => f.replace(/\\/g, '/').toLowerCase().startsWith('docs/'));

console.log(`    • 第二层 空间布局与视觉域 (VISUAL_LAYOUT): ${visualLayoutFiles.length} 个文件`);
visualLayoutFiles.forEach(f => console.log(`      - [空间视觉] ${f}`));

console.log(`    • 第一层 逻辑与状态域 (STATE_LOGIC): ${stateLogicFiles.length} 个文件`);
stateLogicFiles.forEach(f => console.log(`      - [状态逻辑] ${f}`));

console.log(`    • 测试资产变更 (UNIT / E2E): ${testFiles.length} 个文件`);
testFiles.forEach(f => console.log(`      - [测试资产] ${f}`));

if (docFiles.length > 0) {
  console.log(`    • 契约/文档资产: ${docFiles.length} 个文件`);
}

// 检查单测假断言
console.log('\n[2] 正在执行单元测试反例静态语法扫描 (改进 #19 规约)...');
const violations = scanFakeAssertions(files);

if (violations.length > 0) {
  console.error('\n❌ 【P1 规约阻断】检测到单元测试中存在属性传递假断言 (Fake Prop-Passing Assertion)：');
  violations.forEach(v => {
    console.error(`   ▶ ${v.file}:${v.line} -> ${v.code}`);
    console.error(`     原因: ${v.reason}`);
  });
  console.error('\n治理指令：必须移除上述假断言！空间视觉验证应移交真实浏览器 ReDeCheck 几何测量 + VLM 视觉审阅。');
} else {
  console.log('   ✅ 单元测试静态扫描通过，未发现属性假断言。');
}

// 检查第二层与第三层闭环要求
const sourceChangedFiles = [...visualLayoutFiles, ...stateLogicFiles];
console.log('\n[3] 正在核对三层闭环证据要求...');
if (visualLayoutFiles.length > 0) {
  console.log('   ⚠️ 检测到第二层 VISUAL_LAYOUT 改动，必须同时出具双通道硬证据：');
  console.log('      1) BROWSER_GEOMETRY (ReDeCheck 四类核验: Overflow / Overlap / Wrapping&Alignment / ScrollIsolation)');
  console.log('      2) MULTIMODAL_VISUAL (高保真截图 PNG + VLM 视觉审阅结论，不可用 VLM 目测替代定量几何)');
} else {
  console.log('   ✅ 无第二层 VISUAL_LAYOUT 改动。');
}

console.log('\n[4] 正在检索第三层受影响存量 E2E 回归范围 (FLOW_REGRESSION)...');
const impactedSpecs = findImpactedE2ESpecs(sourceChangedFiles);
if (impactedSpecs.length > 0) {
  console.log(`   ⚠️ 发现 ${impactedSpecs.length} 个关联存量 E2E 用例（Gate 3 须纳入回归执行并留存退出码）：`);
  impactedSpecs.forEach(item => {
    console.log(`      - ${item.spec}  (命中锚点: ${item.matchedKeywords.join(', ')})`);
  });
} else if (sourceChangedFiles.length > 0) {
  console.log('   ℹ️ 未在 e2e/ 中匹配到直接引用改动符号的存量用例；仍须确认核心用户旅程 E2E 覆盖。');
} else {
  console.log('   ✅ 无业务源码改动，无需触发增量 E2E 回归检索。');
}

console.log('\n════════════════════════════════════════════════════════════════');
if (violations.length > 0) {
  console.error('  核验结果：FAILED (存在规约阻断项)                             ');
  console.log('════════════════════════════════════════════════════════════════\n');
  process.exit(1);
} else {
  console.log('  核验结果：PASSED (代码与 v1.4 三层闭环规约对齐)               ');
  console.log('════════════════════════════════════════════════════════════════\n');
  process.exit(0);
}
