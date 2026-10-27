<#
.SYNOPSIS
    Repairs the git backup set in BACKUPS\GitBundles so it can actually be restored.

.DESCRIPTION
    The backup script that produced this set had three separate defects.

    1. ENCODING. Patches were written through PowerShell redirection, which
       prepended a UTF-8 BOM, converted every line ending to CRLF, and decoded
       the UTF-8 payload through OEM code page 850 before re-encoding it as
       UTF-8. The mojibake is what actually breaks `git apply`: the patch text
       no longer matches the bytes in the target files.
       Repair: strip BOM, re-encode CP850 -> UTF-8, normalize CRLF -> LF.

    2. PATCH FORMAT. Two of the patch files are not git patches at all:
         - doom-remote_uncommitted_*.patch are `git status --short` output
           (a status report, not a diff).
         - submodule_changes_2026-10-26_223914/224254.patch are a report
           wrapper whose diff payload had all of its newlines collapsed into
           spaces, so git cannot parse it.
       Repair: regenerate the diff from the matching bundle by deleting the
       affected files in a scratch clone and running `git diff HEAD`, which
       reproduces the original patch byte for byte.

    3. ZIP PATHS. The untracked-file zips store their entries relative to
       agent/src/ (web\mod.rs) instead of relative to the submodule root
       (agent/src/web/mod.rs), so extracting them puts files in the wrong
       place.
       Repair: rewrite each entry to its correct repo-relative path, matched
       by file name and verified by SHA-256 against the live file.

    Nothing is overwritten unless -InPlace is passed. Repaired files are
    written alongside the originals with a .repaired suffix.

.PARAMETER BackupDir
    Directory holding the bundles, patches and zips.

.PARAMETER ScratchDir
    Scratch directory used for the regeneration clones.

.PARAMETER LiveSubmodule
    Live submodule working tree, used to resolve the correct zip paths.

.PARAMETER InPlace
    Overwrite originals instead of writing repaired copies alongside them.
#>
[CmdletBinding()]
param(
    [string]$BackupDir = 'C:\Users\DOOM98\BACKUPS\GitBundles',
    [string]$ScratchDir = 'C:\Users\DOOM98\AppData\Local\Temp\opencode\repair',
    [string]$LiveSubmodule = 'C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE\doom-remote',
    [switch]$InPlace
)

$ErrorActionPreference = 'Stop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$cp850 = [System.Text.Encoding]::GetEncoding(
    850,
    [System.Text.EncoderFallback]::ExceptionFallback,
    [System.Text.DecoderFallback]::ExceptionFallback
)

if (-not (Test-Path -LiteralPath $BackupDir)) { throw "BackupDir not found: $BackupDir" }
if (Test-Path -LiteralPath $ScratchDir) { Remove-Item -LiteralPath $ScratchDir -Recurse -Force }
New-Item -ItemType Directory -Path $ScratchDir -Force | Out-Null

$results = [System.Collections.Generic.List[object]]::new()
function Add-Result($Name, $Status, $Detail) {
    $results.Add([pscustomobject]@{ Artifact = $Name; Status = $Status; Detail = $Detail })
}

function Get-Stamp($name) {
    [regex]::Match($name, '(\d{4}-\d{2}-\d{2}_\d{6})').Groups[1].Value
}

# ------------------------------------------------------- encoding repair ---
function Repair-Encoding {
    param([byte[]]$Bytes)
    $hadBom = $Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF
    if ($hadBom) { $Bytes = $Bytes[3..($Bytes.Length - 1)] }
    $text = [System.Text.Encoding]::UTF8.GetString($Bytes)
    # Reverse the CP850 mojibake. Throws if a character is not CP850-mappable,
    # which is the signal that the file was never mojibake'd in the first place.
    $fixed = [System.Text.Encoding]::UTF8.GetString($cp850.GetBytes($text))
    $fixed = $fixed -replace "`r`n", "`n"
    return [pscustomobject]@{ Text = $fixed; HadBom = $hadBom }
}

# ------------------------------------------------------- patch processing ---
$patches = Get-ChildItem -LiteralPath $BackupDir -Filter '*.patch' -File |
           Where-Object { $_.Name -notlike '*.repaired.patch' } | Sort-Object Name

foreach ($p in $patches) {
    $bytes = [System.IO.File]::ReadAllBytes($p.FullName)
    $hadBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF

    # Detect the format from the raw bytes, before any repair. The BOM has to
    # come off first, otherwise it sits in front of the first line and breaks
    # the '^' anchor for single-line status reports.
    $probe = [System.Text.Encoding]::UTF8.GetString($bytes)
    if ($probe.Length -gt 0 -and $probe[0] -eq [char]0xFEFF) { $probe = $probe.Substring(1) }
    $isReport = $probe -match '(?m)^##\s+(Full Diff|Unstaged Diff)'
    $isStatus = $probe -match '(?m)^(\?\?| M|M |A | D) ' -and $probe -notmatch '(?m)^diff --git '

    if ($isStatus) {
        # git status --short output, not a diff. Repair the encoding only and
        # give it a name that says what it is.
        try {
            $r = Repair-Encoding $bytes
            $target = if ($InPlace) { $p.FullName }
                      else { Join-Path $p.DirectoryName ($p.BaseName + '.repaired.status.txt') }
            [System.IO.File]::WriteAllText($target, $r.Text, $utf8NoBom)
            Add-Result $p.Name 'REPAIRED' "status report (not a diff) -> $(Split-Path $target -Leaf)"
        }
        catch {
            Add-Result $p.Name 'FAILED' "encoding repair failed: $($_.Exception.Message)"
        }
        continue
    }

    if ($isReport) {
        # Report wrapper with a collapsed diff payload: regenerate from the bundle.
        $stamp = Get-Stamp $p.Name
        $bundle = Get-ChildItem -LiteralPath $BackupDir -Filter "*$stamp*.bundle" -File |
                  Where-Object { $_.Name -like 'submodule_*' } | Select-Object -First 1
        if (-not $bundle) {
            Add-Result $p.Name 'FAILED' "no submodule bundle for timestamp $stamp"
            continue
        }

        $clone = Join-Path $ScratchDir ("clone_" + $bundle.BaseName)
        & git clone --quiet $bundle.FullName $clone 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Add-Result $p.Name 'FAILED' "could not clone $($bundle.Name)"
            continue
        }

        # Which files does the collapsed diff delete?
        $paths = [regex]::Matches($probe, 'diff --git a/(.+?) b/\1') |
                 ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
        if (-not $paths) {
            Add-Result $p.Name 'FAILED' 'could not determine affected paths from the report'
            continue
        }

        foreach ($rel in $paths) {
            $full = Join-Path $clone ($rel -replace '/', '\')
            if (Test-Path -LiteralPath $full) {
                Remove-Item -LiteralPath $full -Recurse -Force
            }
        }

        $target = if ($InPlace) { $p.FullName }
                  else { Join-Path $p.DirectoryName ($p.BaseName + '.repaired.patch') }
        & git -C $clone diff HEAD --output="$target" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $target)) {
            Add-Result $p.Name 'FAILED' 'regeneration via git diff HEAD failed'
            continue
        }
        Add-Result $p.Name 'REPAIRED' "report format -> regenerated diff for $($paths.Count) file(s)"
        continue
    }

    # Raw git patch: encoding repair only.
    try {
        $r = Repair-Encoding $bytes
        $target = if ($InPlace) { $p.FullName }
                  else { Join-Path $p.DirectoryName ($p.BaseName + '.repaired.patch') }
        [System.IO.File]::WriteAllText($target, $r.Text, $utf8NoBom)
        Add-Result $p.Name 'REPAIRED' "git patch, encoding fixed (BOM=$hadBom) -> $(Split-Path $target -Leaf)"
    }
    catch {
        Add-Result $p.Name 'FAILED' "encoding repair failed: $($_.Exception.Message)"
    }
}

# ----------------------------------------------------------- zip repair ---
Add-Type -AssemblyName System.IO.Compression.FileSystem

$liveUntracked = @()
if (Test-Path -LiteralPath $LiveSubmodule) {
    $liveUntracked = @(& git -C $LiveSubmodule ls-files --others --exclude-standard 2>&1 |
        ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$zips = Get-ChildItem -LiteralPath $BackupDir -Filter '*.zip' -File | Sort-Object Name

foreach ($z in $zips) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($z.FullName)
    $entries = @()
    try {
        foreach ($e in $archive.Entries) {
            if ($e.Length -eq 0) { continue }
            $ms = New-Object System.IO.MemoryStream
            $s = $e.Open(); $s.CopyTo($ms); $s.Close()
            $bytes = $ms.ToArray()
            $sha = (([System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)) |
                    ForEach-Object { $_.ToString('x2') }) -join ''
            $entries += [pscustomobject]@{
                Name = ($e.FullName -replace '\\', '/')
                Bytes = $bytes
                Sha = $sha
            }
        }
    }
    finally { $archive.Dispose() }

    # Resolve each entry to its correct repo-relative path by matching the
    # file name against the live untracked files and verifying the hash.
    $resolved = @()
    $unresolved = @()
    foreach ($e in $entries) {
        $base = [System.IO.Path]::GetFileName($e.Name)
        $cand = $liveUntracked | Where-Object { [System.IO.Path]::GetFileName($_) -eq $base } | Select-Object -First 1
        if (-not $cand) { $unresolved += $e.Name; continue }

        $livePath = Join-Path $LiveSubmodule ($cand -replace '/', '\')
        $liveSha = (([System.Security.Cryptography.SHA256]::Create().ComputeHash(
                        [System.IO.File]::ReadAllBytes($livePath))) |
                    ForEach-Object { $_.ToString('x2') }) -join ''
        if ($liveSha -ne $e.Sha) { $unresolved += "$($e.Name) (hash mismatch)"; continue }
        $resolved += [pscustomobject]@{ Path = $cand; Bytes = $e.Bytes }
    }

    if ($unresolved.Count -gt 0) {
        Add-Result $z.Name 'FAILED' "could not resolve: $($unresolved -join ', ')"
        continue
    }

    $target = if ($InPlace) { $z.FullName }
              else { Join-Path $z.DirectoryName ($z.BaseName + '.repaired.zip') }
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }

    $out = [System.IO.Compression.ZipFile]::Open($target, 'Create')
    try {
        foreach ($r in $resolved) {
            $entry = $out.CreateEntry($r.Path, [System.IO.Compression.CompressionLevel]::Optimal)
            $s = $entry.Open()
            $s.Write($r.Bytes, 0, $r.Bytes.Length)
            $s.Close()
        }
    }
    finally { $out.Dispose() }

    Add-Result $z.Name 'REPAIRED' "re-pathed $($resolved.Count) entry/entries -> $(Split-Path $target -Leaf)"
}

# ----------------------------------------------------------------- report ---
$results | Format-Table -AutoSize -Wrap
$failed = @($results | Where-Object { $_.Status -eq 'FAILED' })
Write-Output ''
Write-Output ("REPAIRED={0}  FAILED={1}" -f
    @($results | Where-Object { $_.Status -eq 'REPAIRED' }).Count, $failed.Count)
if ($failed.Count -gt 0) { exit 1 }
