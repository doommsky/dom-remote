#!/usr/bin/env pwsh
<#
=============================================================================
  BACKUP AUTOMATION - Git Recovery Bundles (v5)

  Creates, for each configured repository:
    <name>_<timestamp>.bundle              full history bundle
    <name>_uncommitted_<timestamp>.patch    real `git diff HEAD` patch
    <name>_status_<timestamp>.txt           `git status --porcelain` snapshot
    <name>_untracked_<timestamp>.zip        untracked files, repo-relative paths
  and for each submodule:
    submodule_<sub>_<timestamp>.bundle
    submodule_changes_<timestamp>.patch
    submodule_untracked_<timestamp>.zip

  Every artifact is written by git or by System.IO directly. Nothing is
  piped through PowerShell text formatting, which is what corrupted the
  v1-v4 output:

    - `Out-File -Encoding UTF8` on Windows PowerShell 5.1 prepends a UTF-8
      BOM and rewrites every line ending as CRLF.
    - Capturing native command output into a variable decodes it with
      [Console]::OutputEncoding, which is the OEM code page (850 on this
      machine), so git's UTF-8 output arrives as mojibake.
    - `$array + "`n"` joins an array of lines with spaces, collapsing the
      whole diff onto one line.
    - `Compress-Archive` stores entries relative to the common parent
      directory of the inputs, which silently drops path prefixes.

  The script finishes by verifying its own output: it clones each bundle,
  applies each patch with `git apply --check`, and extracts each zip.

  Requires Windows PowerShell 5.1 or PowerShell 7+.
=============================================================================
#>

[CmdletBinding()]
param(
    [string]$BackupRoot = "C:\Users\DOOM98\BACKUPS\GitBundles",
    [string]$LogDir = "C:\Users\DOOM98\BACKUPS\Logs",
    [string]$VerifyRoot = "C:\Users\DOOM98\BACKUPS\TestRestore",
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'

# Native command output must be decoded as UTF-8, not the OEM code page.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logPath = Join-Path $LogDir "git_bundle_$timestamp.log"

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $color = switch ($Level) {
        "INFO"    { "Cyan" }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red" }
        "SUCCESS" { "Green" }
        default   { "White" }
    }
    $entry = "[$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')] [$Level] $Message"
    # AppendAllText with a BOM-less encoding keeps the log readable by tools
    # that do not expect a BOM.
    [System.IO.File]::AppendAllText($logPath, "$entry`r`n", $utf8NoBom)
    Write-Host $Message -ForegroundColor $color
}

# --------------------------------------------------------------- helpers ---

function Get-GitOutput {
    <# Runs a git command and returns its stdout as a single string.
       Uses a temp file so the bytes are never routed through the console
       decoder. #>
    param([string]$RepoPath, [string[]]$Arguments)
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        & git -C $RepoPath @Arguments 2>$null | Out-File -FilePath $tmp -Encoding ascii
        return (Get-Content -LiteralPath $tmp -Raw)
    }
    finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
}

function Get-RepoStatus {
    param([string]$RepoPath)
    $lines = @()
    & git -C $RepoPath status --porcelain 2>$null | ForEach-Object {
        if ($_.Trim() -ne '') { $lines += $_.TrimEnd() }
    }
    return $lines
}

function Get-UntrackedFiles {
    <# Individual untracked file paths, relative to the repo root, using
       forward slashes. `git status` reports untracked directories as a
       single entry, which loses the individual file names. #>
    param([string]$RepoPath)
    $files = @()
    & git -C $RepoPath ls-files --others --exclude-standard 2>$null | ForEach-Object {
        $p = $_.Trim()
        if ($p -ne '') { $files += ($p -replace '\\', '/') }
    }
    return $files
}

function Get-Submodules {
    param([string]$RepoPath)
    $subs = @()
    & git -C $RepoPath ls-files --stage 2>$null | ForEach-Object {
        if ($_ -match '^160000\s+([0-9a-f]+)\s+\d+\s+(.+)$') {
            $subs += [pscustomobject]@{
                Path = $matches[2].Trim()
                Hash = $matches[1]
                FullPath = Join-Path $RepoPath $matches[2].Trim()
            }
        }
    }
    return $subs
}

function New-RepoZip {
    <# Builds a zip whose entries are relative to the repo root.
       Compress-Archive cannot do this: it roots entries at the common
       parent directory of the inputs. #>
    param([string]$RepoPath, [string[]]$RelativePaths, [string]$ZipPath)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
    $archive = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')
    try {
        foreach ($rel in $RelativePaths) {
            $full = Join-Path $RepoPath ($rel -replace '/', '\')
            if (-not (Test-Path -LiteralPath $full)) { continue }
            $entry = $archive.CreateEntry(($rel -replace '\\', '/'),
                                         [System.IO.Compression.CompressionLevel]::Optimal)
            $src = [System.IO.File]::OpenRead($full)
            $dst = $entry.Open()
            $src.CopyTo($dst)
            $dst.Close()
            $src.Close()
        }
    }
    finally { $archive.Dispose() }
}

function New-DiffPatch {
    <# Writes a real git patch. `git diff --output` lets git write the bytes
       itself, so no BOM, no CRLF translation and no mojibake. #>
    param([string]$RepoPath, [string]$PatchPath)
    & git -C $RepoPath diff HEAD --output="$PatchPath" 2>$null
    if ($LASTEXITCODE -ne 0) { return $false }
    if (-not (Test-Path -LiteralPath $PatchPath)) { return $false }
    if ((Get-Item -LiteralPath $PatchPath).Length -eq 0) {
        Remove-Item -LiteralPath $PatchPath -Force
        return $false
    }
    return $true
}

function New-StatusFile {
    param([string]$RepoPath, [string]$StatusPath)
    $lines = Get-RepoStatus -RepoPath $RepoPath
    if ($lines.Count -eq 0) { return $false }
    [System.IO.File]::WriteAllText($StatusPath, (($lines -join "`n") + "`n"), $utf8NoBom)
    return $true
}

# ------------------------------------------------------------------ main ---

$repos = @(
    @{
        Name = "DOOM REMOTE"
        Path = "C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE"
        BundleName = "doom-remote"
    }
)

Write-Log "=== Git Bundle Backup Started (v5) ==="
Write-Log "Backup root: $BackupRoot"
Write-Log "Timestamp:    $timestamp"
Write-Log "Log:          $logPath"

$successCount = 0
$failCount = 0
$created = [System.Collections.Generic.List[object]]::new()

foreach ($repo in $repos) {
    Write-Log "Processing: $($repo.Name) at $($repo.Path)"

    if (-not (Test-Path -LiteralPath $repo.Path)) {
        Write-Log "Repository not found: $($repo.Path)" "ERROR"
        $failCount++
        continue
    }
    if (-not (Test-Path -LiteralPath (Join-Path $repo.Path ".git"))) {
        Write-Log "Not a Git repository: $($repo.Path)" "ERROR"
        $failCount++
        continue
    }

    # ---- parent bundle -------------------------------------------------
    $bundleName = "$($repo.BundleName)_$timestamp.bundle"
    $bundlePath = Join-Path $BackupRoot $bundleName
    & git -C $repo.Path bundle create $bundlePath --all 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $bundlePath)) {
        Write-Log "Bundle creation failed: $bundleName" "ERROR"
        $failCount++
        continue
    }
    $sizeMB = [math]::Round((Get-Item -LiteralPath $bundlePath).Length / 1MB, 2)
    Write-Log "Bundle created: $bundleName ($sizeMB MB)" "SUCCESS"
    $created.Add([pscustomobject]@{ Kind = 'bundle'; Path = $bundlePath })

    # ---- parent working tree -------------------------------------------
    $parentPatch = Join-Path $BackupRoot "$($repo.BundleName)_uncommitted_$timestamp.patch"
    if (New-DiffPatch -RepoPath $repo.Path -PatchPath $parentPatch) {
        Write-Log "Parent diff saved: $(Split-Path $parentPatch -Leaf)" "SUCCESS"
        $created.Add([pscustomobject]@{ Kind = 'patch'; Path = $parentPatch; Bundle = $bundlePath })
    }
    else {
        Write-Log "Parent has no tracked-file changes; no patch written"
    }

    $parentStatus = Join-Path $BackupRoot "$($repo.BundleName)_status_$timestamp.txt"
    if (New-StatusFile -RepoPath $repo.Path -StatusPath $parentStatus) {
        Write-Log "Parent status saved: $(Split-Path $parentStatus -Leaf)"
        $created.Add([pscustomobject]@{ Kind = 'status'; Path = $parentStatus })
    }

    $parentUntracked = Get-UntrackedFiles -RepoPath $repo.Path
    if ($parentUntracked.Count -gt 0) {
        $parentZip = Join-Path $BackupRoot "$($repo.BundleName)_untracked_$timestamp.zip"
        New-RepoZip -RepoPath $repo.Path -RelativePaths $parentUntracked -ZipPath $parentZip
        Write-Log "Parent untracked files archived: $($parentUntracked.Count) file(s)" "SUCCESS"
        $created.Add([pscustomobject]@{ Kind = 'zip'; Path = $parentZip })
    }

    # ---- submodules -----------------------------------------------------
    foreach ($sub in (Get-Submodules -RepoPath $repo.Path)) {
        Write-Log "Processing submodule: $($sub.Path)"

        if (-not (Test-Path -LiteralPath (Join-Path $sub.FullPath ".git"))) {
            Write-Log "  submodule not initialised, skipping" "WARN"
            continue
        }

        $subBundleName = "submodule_$($sub.Path.Split('/')[-1])_$timestamp.bundle"
        $subBundlePath = Join-Path $BackupRoot $subBundleName
        & git -C $sub.FullPath bundle create $subBundlePath --all 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $subBundlePath)) {
            $subSizeMB = [math]::Round((Get-Item -LiteralPath $subBundlePath).Length / 1MB, 2)
            Write-Log "  submodule bundle created: $subBundleName ($subSizeMB MB)" "SUCCESS"
            $created.Add([pscustomobject]@{ Kind = 'bundle'; Path = $subBundlePath })
        }
        else {
            Write-Log "  submodule bundle failed: $subBundleName" "ERROR"
            $failCount++
        }

        $subPatch = Join-Path $BackupRoot "submodule_changes_$timestamp.patch"
        if (New-DiffPatch -RepoPath $sub.FullPath -PatchPath $subPatch) {
            Write-Log "  submodule diff saved: $(Split-Path $subPatch -Leaf)" "SUCCESS"
            $created.Add([pscustomobject]@{ Kind = 'patch'; Path = $subPatch; Bundle = $subBundlePath })
        }
        else {
            Write-Log "  submodule has no tracked-file changes; no patch written"
        }

        $subUntracked = Get-UntrackedFiles -RepoPath $sub.FullPath
        if ($subUntracked.Count -gt 0) {
            $subZip = Join-Path $BackupRoot "submodule_untracked_$timestamp.zip"
            New-RepoZip -RepoPath $sub.FullPath -RelativePaths $subUntracked -ZipPath $subZip
            Write-Log "  submodule untracked files archived: $($subUntracked.Count) file(s)" "SUCCESS"
            $created.Add([pscustomobject]@{ Kind = 'zip'; Path = $subZip })
        }
    }

    $successCount++
}

# ------------------------------------------------------------- verify ------
if (-not $SkipVerify) {
    Write-Log "=== Verifying created artifacts ==="
    if (Test-Path -LiteralPath $VerifyRoot) { Remove-Item -LiteralPath $VerifyRoot -Recurse -Force }
    New-Item -ItemType Directory -Path $VerifyRoot -Force | Out-Null

    $n = 0
    $cloneOfBundle = @{}
    foreach ($item in ($created | Where-Object { $_.Kind -eq 'bundle' })) {
        $n++
        $clone = Join-Path $VerifyRoot "clone_$n"
        & git clone --quiet $item.Path $clone 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Log "  VERIFY FAIL: could not clone $(Split-Path $item.Path -Leaf)" "ERROR"
            $failCount++
            continue
        }
        $cloneOfBundle[$item.Path] = $clone
        Write-Log "  VERIFY OK: cloned $(Split-Path $item.Path -Leaf)" "SUCCESS"
    }

    foreach ($item in ($created | Where-Object { $_.Kind -eq 'patch' })) {
        # A patch belongs to exactly one bundle: the one it was taken against.
        if (-not $item.Bundle -or -not $cloneOfBundle.ContainsKey($item.Bundle)) {
            Write-Log "  VERIFY FAIL: $(Split-Path $item.Path -Leaf) has no matching bundle" "ERROR"
            $failCount++
            continue
        }
        $clone = $cloneOfBundle[$item.Bundle]
        & git -C $clone apply --check $item.Path 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "  VERIFY OK: $(Split-Path $item.Path -Leaf) applies to $(Split-Path $item.Bundle -Leaf)" "SUCCESS"
        }
        else {
            Write-Log "  VERIFY FAIL: $(Split-Path $item.Path -Leaf) does not apply to $(Split-Path $item.Bundle -Leaf)" "ERROR"
            $failCount++
        }
    }

    foreach ($item in ($created | Where-Object { $_.Kind -eq 'zip' })) {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [System.IO.Compression.ZipFile]::OpenRead($item.Path)
        try {
            $entries = @($archive.Entries | Where-Object { $_.Length -gt 0 })
            $bad = @($entries | Where-Object { $_.FullName -match '^[A-Za-z]:' -or $_.FullName -match '^\.\.' })
            if ($bad.Count -gt 0) {
                Write-Log "  VERIFY FAIL: $(Split-Path $item.Path -Leaf) has unsafe entries" "ERROR"
                $failCount++
            }
            else {
                Write-Log "  VERIFY OK: $(Split-Path $item.Path -Leaf) has $($entries.Count) repo-relative entry/entries" "SUCCESS"
            }
        }
        finally { $archive.Dispose() }
    }
}

Write-Log "=== BACKUP SUMMARY ==="
Write-Log "Successful repos: $successCount"
Write-Log "Failures:          $failCount"
Write-Log "Artifacts created: $($created.Count)"
Write-Log "Log saved to: $logPath"

if ($failCount -gt 0) { exit 1 } else { exit 0 }
