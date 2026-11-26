#!/usr/bin/env bash
# ==============================================================================
# sync.sh - Orca 研发测试小分队协同配置同步工具 (macOS / Linux)
#
# 用法:
#   ./sync.sh                # 默认：将仓库配置同步到本机 Orca (~/.orca/bots)
#   ./sync.sh --capture      # 反向采集：将本机更新的 SOUL/协议采集回本仓库
# ==============================================================================

set -euo pipefail

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

MODE="apply"
if [ "${1:-}" = "--capture" ] || [ "${1:-}" = "-c" ] || [ "${1:-}" = "capture" ]; then
  MODE="capture"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_SHARED_DIR="${SCRIPT_DIR}/_shared"
REPO_SQUAD_DIR="${SCRIPT_DIR}/squad"
REPO_SKILLS_DIR="${SCRIPT_DIR}/skills"
ORCA_BOTS_ROOT="${HOME}/.orca/bots"

mkdir -p "${ORCA_BOTS_ROOT}"

echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN} 🚀 Orca 研发测试小分队同步脚本 (macOS / Linux) - [${MODE}]${NC}"
echo -e "${GRAY} 📂 Orca 根目录: ${ORCA_BOTS_ROOT}${NC}"
echo -e "${CYAN}==========================================================${NC}"

# 提取 bot.json 中的 name 字段
get_bot_name() {
  local json_file="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import json, sys; d=json.load(open(sys.argv[1], encoding='utf-8')); print(d.get('name',''))" "$json_file" 2>/dev/null && return
  fi
  if command -v node >/dev/null 2>&1; then
    node -e "const fs=require('fs'); try { const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d.name||''); } catch(e){}" "$json_file" 2>/dev/null && return
  fi
  grep -E '"name"[[:space:]]*:' "$json_file" | head -n 1 | sed -E 's/.*"name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
}

# 查找指定名称的 Bot 所在目录路径
find_bot_dir_by_name() {
  local target_name="$1"
  for dir in "${ORCA_BOTS_ROOT}"/*/; do
    [ -d "$dir" ] || continue
    local b_json="${dir}bot.json"
    if [ -f "$b_json" ]; then
      local b_name
      b_name="$(get_bot_name "$b_json")"
      if [ "$b_name" = "$target_name" ]; then
        echo "$dir"
        return 0
      fi
    fi
  done
  return 1
}

# 核心角色定义
REQUIRED_BOTS=("需求契约Bot" "CqingCodeBot" "跨端测试Bot" "证据审查Bot")
OPTIONAL_BOTS=("提交整理Bot")

if [ "$MODE" = "apply" ]; then
  # 1. 同步 _shared 共享底座
  local_shared="${ORCA_BOTS_ROOT}/_shared"
  mkdir -p "${local_shared}"
  if [ -d "${REPO_SHARED_DIR}" ]; then
    cp -Rf "${REPO_SHARED_DIR}/"* "${local_shared}/"
    echo -e "${GREEN}✅ [共享底座] _shared 协议与探针已同步至: ${local_shared}${NC}"
  fi

  # 2. 注入各 Bot 配置
  missing_bots=()

  # 需求契约Bot
  dir_xq="$(find_bot_dir_by_name "需求契约Bot" || true)"
  if [ -n "$dir_xq" ]; then
    cp -f "${REPO_SQUAD_DIR}/需求契约Bot/SOUL.md" "${dir_xq}/SOUL.md"
    echo -e "${GREEN}✅ [Orca Bot] 已注入: 需求契约Bot -> ${dir_xq}${NC}"
  else
    missing_bots+=("需求契约Bot")
  fi

  # CqingCodeBot
  dir_code="$(find_bot_dir_by_name "CqingCodeBot" || true)"
  if [ -n "$dir_code" ]; then
    cp -f "${REPO_SQUAD_DIR}/CqingCodeBot/SOUL.md" "${dir_code}/SOUL.md"
    mkdir -p "${dir_code}/memory"
    cp -Rf "${REPO_SQUAD_DIR}/CqingCodeBot/memory/"* "${dir_code}/memory/"
    echo -e "${GREEN}✅ [Orca Bot] 已注入: CqingCodeBot -> ${dir_code}${NC}"
  else
    missing_bots+=("CqingCodeBot")
  fi

  # 跨端测试Bot
  dir_test="$(find_bot_dir_by_name "跨端测试Bot" || true)"
  if [ -n "$dir_test" ]; then
    cp -f "${REPO_SQUAD_DIR}/跨端测试Bot/SOUL.md" "${dir_test}/SOUL.md"
    mkdir -p "${dir_test}/memory"
    cp -Rf "${REPO_SQUAD_DIR}/跨端测试Bot/memory/"* "${dir_test}/memory/"
    echo -e "${GREEN}✅ [Orca Bot] 已注入: 跨端测试Bot -> ${dir_test}${NC}"
  else
    missing_bots+=("跨端测试Bot")
  fi

  # 证据审查Bot
  dir_audit="$(find_bot_dir_by_name "证据审查Bot" || true)"
  if [ -n "$dir_audit" ]; then
    cp -f "${REPO_SQUAD_DIR}/证据审查Bot/SOUL.md" "${dir_audit}/SOUL.md"
    mkdir -p "${dir_audit}/memory"
    cp -Rf "${REPO_SQUAD_DIR}/证据审查Bot/memory/"* "${dir_audit}/memory/"
    echo -e "${GREEN}✅ [Orca Bot] 已注入: 证据审查Bot -> ${dir_audit}${NC}"
  else
    missing_bots+=("证据审查Bot")
  fi

  # 提交整理Bot (可选)
  dir_commit="$(find_bot_dir_by_name "提交整理Bot" || true)"
  if [ -n "$dir_commit" ]; then
    cp -f "${REPO_SQUAD_DIR}/提交整理Bot/SOUL.md" "${dir_commit}/SOUL.md"
    if [ -d "${REPO_SKILLS_DIR}/commit-curator" ]; then
      mkdir -p "${dir_commit}/skills/commit-curator"
      cp -Rf "${REPO_SKILLS_DIR}/commit-curator/"* "${dir_commit}/skills/commit-curator/"
    fi
    echo -e "${GREEN}✅ [Orca Bot] 已注入: 提交整理Bot -> ${dir_commit}${NC}"
  fi

  # 检查缺失核心 Bot
  if [ ${#missing_bots[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  注意: 以下核心 Bot 尚未在 Orca 中创建:${NC}"
    for m in "${missing_bots[@]}"; do
      echo -e "${YELLOW}   - ${m}${NC}"
    done
    echo -e "${GRAY}👉 请在 Orca 界面点击「新建 bot」，使用完全一致的名字创建。${NC}"
    echo -e "${GRAY}   创建完成后重新运行本脚本 (./sync.sh)，即可自动注入配置！${NC}"
  fi

elif [ "$MODE" = "capture" ]; then
  # 1. 采集 _shared
  local_shared="${ORCA_BOTS_ROOT}/_shared"
  if [ -d "${local_shared}" ]; then
    mkdir -p "${REPO_SHARED_DIR}"
    cp -Rf "${local_shared}/"* "${REPO_SHARED_DIR}/"
    echo -e "${GREEN}✅ [反向采集] _shared 共享协议已回写本仓库${NC}"
  fi

  # 2. 采集各 Bot 的 SOUL 与 memory
  for b_name in "需求契约Bot" "CqingCodeBot" "跨端测试Bot" "证据审查Bot" "提交整理Bot"; do
    dir_b="$(find_bot_dir_by_name "$b_name" || true)"
    if [ -n "$dir_b" ]; then
      mkdir -p "${REPO_SQUAD_DIR}/${b_name}"
      if [ -f "${dir_b}/SOUL.md" ]; then
        cp -f "${dir_b}/SOUL.md" "${REPO_SQUAD_DIR}/${b_name}/SOUL.md"
      fi
      if [ -d "${dir_b}/memory" ]; then
        mkdir -p "${REPO_SQUAD_DIR}/${b_name}/memory"
        cp -Rf "${dir_b}/memory/"* "${REPO_SQUAD_DIR}/${b_name}/memory/"
      fi
      echo -e "${GREEN}✅ [反向采集] 「${b_name}」配置已回写仓库${NC}"
    fi
  done
  echo -e "${GRAY}👉 请使用 git status / git diff 核对后 commit 并 push 到远程仓库。${NC}"
fi

echo -e "${CYAN}==========================================================${NC}"
echo -e "${GREEN}🎉 同步完成！${NC}"
echo -e "${CYAN}==========================================================${NC}"
