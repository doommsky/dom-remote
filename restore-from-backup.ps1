<#
.SYNOPSIS
    Restores a DOOM REMOTE backup set into an isolated directory.

.DESCRIPTION
    Implements the restore procedure documented in backup-restore-audit.md,
    using only the artifacts of a single timestamp:

      1. clone the parent bundle
      2. clone the submodule bundle into the parent's gitlink path
      3. apply the parent patch (the submodule dirty marker)
      4. apply the submodule patch (tracked working-tree changes)
      5. extract the submodule untracked-files zip

    The parent repository has no .gitmodules file, so the submodule cannot be
    populated with `git submodule update`; it is cloned into the gitlink path
    directly.

    Nothing outside the restore directory is written to. The live source
    repository and the backup artifacts are only read.

.PARAMETER Timestamp
    Backup timestamp to restore, e.g. 2026-10-27_033747. Defaults to the
    newest timestamp present in the backup root.

.PARAMETER BackupRoot
    Directory holding the bundles, patches and zips.

.PARAMETER RestoreRoot
    Parent directory for the isolated restore.

.PARAMETER Name
    Name of the restore directory. Defaults to validate_<timestamp>.

.EXAMPLE
    .\restore-from-backup.ps1 -Timestamp 2026-10-27_033747
#>
[CmdletBinding()]
param(
    [string]$Timestamp,
    [string]$BackupRoot = 'C:\Users\DOOM98\BACKUPS\GitBundles',
    [string]$RestoreRoot = 'C:\Users\DOOM98\BACKUPS\TestRestore',
    [string]$Name
)

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

if (-not $Timestamp) {
    $newest = Get-ChildItem -LiteralPath $BackupRoot -Filter 'doom-remote_*.bundle' -File |
              Sort-Object Name | Select-Object -Last 1
    if (-not $newest) { throw "No parent bundle found in $BackupRoot" }
    $Timestamp = [regex]::Match($newest.Name, '(\d{4}-\d{2}-\d{2}_\d{6})').Groups[1].Value
}
if (-not $Name) { $Name = "validate_$Timestamp" }

$restoreDir = Join-Path $RestoreRoot $Name
if (Test-Path -LiteralPath $restoreDir) {
    throw "Restore directory already exists: $restoreDir (pick a different -Name)"
}
New-Item -ItemType Directory -Path $restoreDir -Force | Out-Null

$logPath = Join-Path $restoreDir "restore.log"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Write-Log($Message, $Level = 'INFO') {
    $line = "[$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')] [$Level] $Message"
    [System.IO.File]::AppendAllText($logPath, "$line`r`n", $utf8NoBom)
    Write-Host $Message
}

# ------------------------------------------------------------ artifacts ---
$parentBundle   = Join-Path $BackupRoot "doom-remote_$Timestamp.bundle"
$parentPatch    = Join-Path $BackupRoot "doom-remote_uncommitted_$Timestamp.patch"
$subBundle      = Join-Path $BackupRoot "submodule_doom-remote_$Timestamp.bundle"
$subPatch       = Join-Path $BackupRoot "submodule_changes_$Timestamp.patch"
$subZip         = Join-Path $BackupRoot "submodule_untracked_$Timestamp.zip"

Write-Log "=== Restore started ==="
Write-Log "Timestamp:   $Timestamp"
Write-Log "Backup root: $BackupRoot"
Write-Log "Restore to:  $restoreDir"

foreach ($a in @($parentBundle, $parentPatch, $subBundle, $subPatch, $subZip)) {
    if (-not (Test-Path -LiteralPath $a)) {
        Write-Log "MISSING ARTIFACT: $a" 'ERROR'
        exit 2
    }
}
Write-Log "All 5 artifacts present for $Timestamp"

# --------------------------------------------------------------- parent ---
$parentDir = Join-Path $restoreDir 'parent'
& git clone --quiet $parentBundle $parentDir 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Log "Parent clone failed" 'ERROR'; exit 3 }
$parentHead = (& git -C $parentDir rev-parse HEAD).Trim()
Write-Log "Parent cloned: HEAD=$parentHead"

# The parent tracks doom-remote as a gitlink but has no .gitmodules, so the
# submodule is cloned into the gitlink path directly.
$subDir = Join-Path $parentDir 'doom-remote'
if (Test-Path -LiteralPath $subDir) {
    if (@(Get-ChildItem -LiteralPath $subDir -Force).Count -gt 0) {
        Write-Log "Gitlink path is not empty: $subDir" 'ERROR'; exit 4
    }
    Remove-Item -LiteralPath $subDir -Recurse -Force
}
& git clone --quiet $subBundle $subDir 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Log "Submodule clone failed" 'ERROR'; exit 5 }
$subHead = (& git -C $subDir rev-parse HEAD).Trim()
Write-Log "Submodule cloned into gitlink path: HEAD=$subHead"

# --------------------------------------------------------------- patches ---
# The parent patch records the parent's working-tree state. For this project
# its only content is the submodule dirty marker:
#
#     -Subproject commit 18c17802...
#     +Subproject commit 18c17802...-dirty
#
# Applying that hunk with `git apply` makes git try to rmdir the submodule
# directory, which fails once the submodule has been cloned into it. The
# dirty marker is not something to apply: it is the natural consequence of
# restoring the submodule's own dirty working tree, which the steps below
# already do. So the gitlink hunk is excluded and any other parent change is
# applied normally.
& git -C $parentDir apply --exclude=doom-remote $parentPatch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Log "Parent patch failed to apply" 'ERROR'; exit 6 }
Write-Log "Parent patch applied (gitlink hunk excluded): $(Split-Path $parentPatch -Leaf)"

& git -C $subDir apply $subPatch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Log "Submodule patch failed to apply" 'ERROR'; exit 7 }
Write-Log "Submodule patch applied: $(Split-Path $subPatch -Leaf)"

# ------------------------------------------------------------------ zip ---
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($subZip)
$extracted = 0
try {
    foreach ($e in $archive.Entries) {
        if ($e.Length -eq 0) { continue }
        $dest = Join-Path $subDir ($e.FullName -replace '\\', '\')
        $dir = Split-Path $dest -Parent
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $s = $e.Open()
        $fs = [System.IO.File]::Create($dest)
        $s.CopyTo($fs)
        $fs.Close(); $s.Close()
        $extracted++
    }
}
finally { $archive.Dispose() }
Write-Log "Untracked zip extracted: $extracted file(s) from $(Split-Path $subZip -Leaf)"

# --------------------------------------------------------------- report ---
Write-Log "--- restored parent status ---"
& git -C $parentDir status --porcelain | ForEach-Object { Write-Log "  $_" }
Write-Log "--- restored submodule status ---"
& git -C $subDir status --porcelain | ForEach-Object { Write-Log "  $_" }
Write-Log "=== Restore complete ==="

[pscustomobject]@{
    RestoreDir = $restoreDir
    ParentDir  = $parentDir
    SubmoduleDir = $subDir
    ParentHEAD = $parentHead
    SubmoduleHEAD = $subHead
    Log = $logPath
} | Format-List
