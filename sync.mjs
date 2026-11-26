#!/usr/bin/env node
// ==============================================================================
// sync.mjs - 跨平台（Mac / Windows / Linux）无差异 Node.js 同步脚本
//
// 用法:
//   node sync.mjs            # 默认：将仓库配置同步到本机 Orca (~/.orca/bots)
//   node sync.mjs --capture  # 反向采集：将本机更新的 SOUL/协议采集回本仓库
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCapture = process.argv.includes('--capture') || process.argv.includes('-c');
const mode = isCapture ? 'capture' : 'apply';

const homeDir = os.homedir();
const orcaBotsRoot = path.join(homeDir, '.orca', 'bots');
const repoSharedDir = path.join(__dirname, '_shared');
const repoSquadDir = path.join(__dirname, 'squad');
const repoSkillsDir = path.join(__dirname, 'skills');

console.log('\x1b[36m==========================================================\x1b[0m');
console.log(`\x1b[36m 🚀 Orca 研发测试小分队跨端同步工具 (Node.js) - [${mode}]\x1b[0m`);
console.log(`\x1b[90m 📂 Orca 根目录: ${orcaBotsRoot}\x1b[0m`);
console.log('\x1b[36m==========================================================\x1b[0m');

if (!fs.existsSync(orcaBotsRoot)) {
  fs.mkdirSync(orcaBotsRoot, { recursive: true });
}

// 建立本地已存在的 Bot 映射: name -> directory
function getLocalBotMap() {
  const map = new Map();
  const entries = fs.readdirSync(orcaBotsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const botJsonPath = path.join(orcaBotsRoot, entry.name, 'bot.json');
    if (fs.existsSync(botJsonPath)) {
      try {
        const raw = fs.readFileSync(botJsonPath, 'utf8');
        const json = JSON.parse(raw);
        if (json.name) {
          map.set(json.name, path.join(orcaBotsRoot, entry.name));
        }
      } catch {}
    }
  }
  return map;
}

const botDefs = [
  {
    name: '需求契约Bot',
    soul: path.join(repoSquadDir, '需求契约Bot', 'SOUL.md'),
    memoryFiles: [],
    required: true,
  },
  {
    name: 'CqingCodeBot',
    soul: path.join(repoSquadDir, 'CqingCodeBot', 'SOUL.md'),
    memorySrc: path.join(repoSquadDir, 'CqingCodeBot', 'memory'),
    memoryFiles: ['cqing-better-code.md'],
    required: true,
  },
  {
    name: '跨端测试Bot',
    soul: path.join(repoSquadDir, '跨端测试Bot', 'SOUL.md'),
    memorySrc: path.join(repoSquadDir, '跨端测试Bot', 'memory'),
    memoryFiles: ['cqing-better-code.md', 'cross-platform-testing.md'],
    required: true,
  },
  {
    name: '证据审查Bot',
    soul: path.join(repoSquadDir, '证据审查Bot', 'SOUL.md'),
    memorySrc: path.join(repoSquadDir, '证据审查Bot', 'memory'),
    memoryFiles: ['cqing-better-code.md'],
    required: true,
  },
  {
    name: '提交整理Bot',
    soul: path.join(repoSquadDir, '提交整理Bot', 'SOUL.md'),
    skills: ['commit-curator'],
    required: false,
  },
];

const localMap = getLocalBotMap();

if (mode === 'apply') {
  // 1. 同步 _shared
  const dstShared = path.join(orcaBotsRoot, '_shared');
  if (fs.existsSync(repoSharedDir)) {
    fs.mkdirSync(dstShared, { recursive: true });
    fs.cpSync(repoSharedDir, dstShared, { recursive: true, force: true });
    console.log(`\x1b[32m✅ [共享底座] _shared 协议与探针已同步至: ${dstShared}\x1b[0m`);
  }

  // 2. 依次注入各 Bot
  const missing = [];
  for (const def of botDefs) {
    if (localMap.has(def.name)) {
      const targetDir = localMap.get(def.name);
      // SOUL
      if (def.soul && fs.existsSync(def.soul)) {
        fs.copyFileSync(def.soul, path.join(targetDir, 'SOUL.md'));
      }
      // Memory
      if (def.memoryFiles && def.memoryFiles.length > 0 && fs.existsSync(def.memorySrc)) {
        const dstMem = path.join(targetDir, 'memory');
        fs.mkdirSync(dstMem, { recursive: true });
        for (const mf of def.memoryFiles) {
          const srcMf = path.join(def.memorySrc, mf);
          if (fs.existsSync(srcMf)) {
            fs.copyFileSync(srcMf, path.join(dstMem, mf));
          }
        }
      }
      // Skills
      if (def.skills) {
        for (const sk of def.skills) {
          const srcSk = path.join(repoSkillsDir, sk);
          if (fs.existsSync(srcSk)) {
            const dstSk = path.join(targetDir, 'skills', sk);
            fs.mkdirSync(dstSk, { recursive: true });
            fs.cpSync(srcSk, dstSk, { recursive: true, force: true });
          }
        }
      }
      console.log(`\x1b[32m✅ [Orca Bot] 已注入: ${def.name} -> ${targetDir}\x1b[0m`);
    } else {
      if (def.required) {
        missing.push(def.name);
      }
    }
  }

  if (missing.length > 0) {
    console.log('\n\x1b[33m⚠️  注意: 以下核心 Bot 尚未在 Orca 中创建:\x1b[0m');
    for (const m of missing) {
      console.log(`\x1b[33m   - ${m}\x1b[0m`);
    }
    console.log('\x1b[90m👉 请在 Orca 界面点击「新建 bot」，使用完全一致的名字创建。\x1b[0m');
    console.log('\x1b[90m   创建完成后重新运行本脚本，即可自动注入配置！\x1b[0m');
  }
} else {
  // Capture
  const localShared = path.join(orcaBotsRoot, '_shared');
  if (fs.existsSync(localShared)) {
    fs.mkdirSync(repoSharedDir, { recursive: true });
    fs.cpSync(localShared, repoSharedDir, { recursive: true, force: true });
    console.log(`\x1b[32m✅ [反向采集] _shared 共享协议已回写本仓库\x1b[0m`);
  }

  for (const def of botDefs) {
    if (localMap.has(def.name)) {
      const localDir = localMap.get(def.name);
      const localSoul = path.join(localDir, 'SOUL.md');
      if (fs.existsSync(localSoul)) {
        fs.mkdirSync(path.dirname(def.soul), { recursive: true });
        fs.copyFileSync(localSoul, def.soul);
      }
      if (def.memoryFiles && def.memoryFiles.length > 0) {
        const localMem = path.join(localDir, 'memory');
        if (fs.existsSync(localMem)) {
          fs.mkdirSync(def.memorySrc, { recursive: true });
          for (const mf of def.memoryFiles) {
            const srcF = path.join(localMem, mf);
            if (fs.existsSync(srcF)) {
              fs.copyFileSync(srcF, path.join(def.memorySrc, mf));
            }
          }
        }
      }
      console.log(`\x1b[32m✅ [反向采集] 「${def.name}」配置已回写仓库\x1b[0m`);
    }
  }
  console.log('\x1b[90m👉 请使用 git status / git diff 核对后 commit 并 push 到远程仓库。\x1b[0m');
}

console.log('\x1b[36m==========================================================\x1b[0m');
console.log('\x1b[32m🎉 同步完成！\x1b[0m');
console.log('\x1b[36m==========================================================\x1b[0m');
