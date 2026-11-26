# ==============================================================================
# sync.ps1 - Orca 研发测试小分队协同配置同步工具 (Windows)
# 
# 用法:
#   .\sync.ps1                         # 默认：将仓库配置同步到本机 Orca (~/.orca/bots)
#   .\sync.ps1 -Mode CaptureFromLocal  # 反向采集：将本机更新的 SOUL/协议采集回本仓库
# ==============================================================================

[CmdletBinding()]
param(
    [ValidateSet("ApplyToLocal", "CaptureFromLocal")]
    [string]$Mode = "ApplyToLocal"
)

$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoSharedDir = Join-Path $ScriptDir "_shared"
$RepoSquadDir = Join-Path $ScriptDir "squad"
$RepoSkillsDir = Join-Path $ScriptDir "skills"
$OrcaBotsRoot = Join-Path $env:USERPROFILE ".orca\bots"

$BotDefinitions = @(
    @{
        Name        = "需求契约Bot"
        SoulSource  = Join-Path $RepoSquadDir "需求契约Bot\SOUL.md"
        MemoryFiles = @()
        Skills      = @()
        Required    = $true
    },
    @{
        Name        = "CqingCodeBot"
        SoulSource  = Join-Path $RepoSquadDir "CqingCodeBot\SOUL.md"
        MemoryFiles = @("cqing-better-code.md")
        MemorySrc   = Join-Path $RepoSquadDir "CqingCodeBot\memory"
        Skills      = @()
        Required    = $true
    },
    @{
        Name        = "跨端测试Bot"
        SoulSource  = Join-Path $RepoSquadDir "跨端测试Bot\SOUL.md"
        MemoryFiles = @("cqing-better-code.md", "cross-platform-testing.md")
        MemorySrc   = Join-Path $RepoSquadDir "跨端测试Bot\memory"
        Skills      = @()
        Required    = $true
    },
    @{
        Name        = "证据审查Bot"
        SoulSource  = Join-Path $RepoSquadDir "证据审查Bot\SOUL.md"
        MemoryFiles = @("cqing-better-code.md")
        MemorySrc   = Join-Path $RepoSquadDir "证据审查Bot\memory"
        Skills      = @()
        Required    = $true
    },
    @{
        Name        = "提交整理Bot"
        SoulSource  = Join-Path $RepoSquadDir "提交整理Bot\SOUL.md"
        MemoryFiles = @()
        Skills      = @("commit-curator")
        Required    = $false
    }
)

function Find-LocalOrcaBotMap {
    $map = @{}
    if (-not (Test-Path $OrcaBotsRoot)) { return $map }
    Get-ChildItem -Path $OrcaBotsRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $botJsonPath = Join-Path $_.FullName "bot.json"
        if (Test-Path $botJsonPath) {
            try {
                $raw = Get-Content $botJsonPath -Raw -Encoding UTF8
                $cfg = $raw | ConvertFrom-Json
                if ($cfg.name) {
                    $map[$cfg.name] = $_.FullName
                }
            } catch {}
        }
    }
    return $map
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Orca 研发测试小分队同步脚本 (Windows) - $Mode" -ForegroundColor Cyan
Write-Host " 📂 Orca 根目录: $OrcaBotsRoot" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $OrcaBotsRoot)) {
    New-Item -ItemType Directory -Path $OrcaBotsRoot -Force | Out-Null
}

$LocalBotMap = Find-LocalOrcaBotMap

if ($Mode -eq "ApplyToLocal") {
    # 1. 同步 _shared 核心协议与探针
    $dstShared = Join-Path $OrcaBotsRoot "_shared"
    if (Test-Path $RepoSharedDir) {
        New-Item -ItemType Directory -Path $dstShared -Force | Out-Null
        Get-ChildItem -Path $RepoSharedDir -File | Copy-Item -Destination $dstShared -Force
        Write-Host "✅ [共享底座] _shared 协议与探针已同步至: $dstShared" -ForegroundColor Green
    }

    # 2. 依次注入各 Bot 的 SOUL.md、memory 与 skills
    $missingBots = @()
    foreach ($def in $BotDefinitions) {
        $botName = $def.Name
        if ($LocalBotMap.ContainsKey($botName)) {
            $targetDir = $LocalBotMap[$botName]
            
            # SOUL.md
            if (Test-Path $def.SoulSource) {
                Copy-Item -Path $def.SoulSource -Destination (Join-Path $targetDir "SOUL.md") -Force
            }
            
            # memory
            if ($def.MemoryFiles.Count -gt 0 -and (Test-Path $def.MemorySrc)) {
                $dstMemDir = Join-Path $targetDir "memory"
                New-Item -ItemType Directory -Path $dstMemDir -Force | Out-Null
                foreach ($mf in $def.MemoryFiles) {
                    $mfSrc = Join-Path $def.MemorySrc $mf
                    if (Test-Path $mfSrc) {
                        Copy-Item -Path $mfSrc -Destination (Join-Path $dstMemDir $mf) -Force
                    }
                }
            }
            
            # skills
            foreach ($sk in $def.Skills) {
                $skSrc = Join-Path $RepoSkillsDir $sk
                $skDst = Join-Path $targetDir "skills\$sk"
                if (Test-Path $skSrc) {
                    New-Item -ItemType Directory -Path $skDst -Force | Out-Null
                    Copy-Item -Path (Join-Path $skSrc "*") -Destination $skDst -Recurse -Force
                }
            }
            Write-Host "✅ [Orca Bot] 已注入: $botName -> $targetDir" -ForegroundColor Green
        } else {
            if ($def.Required) {
                $missingBots += $botName
            }
        }
    }

    if ($missingBots.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  注意: 以下核心 Bot 尚未在 Orca 中创建:" -ForegroundColor Yellow
        foreach ($m in $missingBots) {
            Write-Host "   - $m" -ForegroundColor Yellow
        }
        Write-Host "👉 请在 Orca 界面点击「新建 bot」，名称使用上述完全一致的名字创建。" -ForegroundColor Gray
        Write-Host "   创建完成后重新运行本脚本，即可自动注入配置！" -ForegroundColor Gray
    }
}
elseif ($Mode -eq "CaptureFromLocal") {
    # 1. 采集 _shared
    $dstShared = Join-Path $OrcaBotsRoot "_shared"
    if (Test-Path $dstShared) {
        Get-ChildItem -Path $dstShared -File | Copy-Item -Destination $RepoSharedDir -Force
        Write-Host "✅ [反向采集] _shared 共享协议已回写本仓库" -ForegroundColor Green
    }

    # 2. 采集各 Bot 的 SOUL 与 memory
    foreach ($def in $BotDefinitions) {
        $botName = $def.Name
        if ($LocalBotMap.ContainsKey($botName)) {
            $localDir = $LocalBotMap[$botName]
            $localSoul = Join-Path $localDir "SOUL.md"
            if (Test-Path $localSoul) {
                $dstParent = Split-Path -Parent $def.SoulSource
                New-Item -ItemType Directory -Path $dstParent -Force | Out-Null
                Copy-Item -Path $localSoul -Destination $def.SoulSource -Force
            }
            if ($def.MemoryFiles.Count -gt 0) {
                $localMemDir = Join-Path $localDir "memory"
                New-Item -ItemType Directory -Path $def.MemorySrc -Force | Out-Null
                foreach ($mf in $def.MemoryFiles) {
                    $localMf = Join-Path $localMemDir $mf
                    if (Test-Path $localMf) {
                        Copy-Item -Path $localMf -Destination (Join-Path $def.MemorySrc $mf) -Force
                    }
                }
            }
            Write-Host "✅ [反向采集] 「$botName」配置已回写仓库" -ForegroundColor Green
        }
    }
    Write-Host "👉 请使用 git status / git diff 核对后 commit 并 push 到远程仓库。" -ForegroundColor Gray
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🎉 同步完成！" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
