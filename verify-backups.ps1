<#
.SYNOPSIS
    Verifies the backup set in BACKUPS\GitBundles restores correctly.

.DESCRIPTION
    Three layers of checks:

      1. PER-ARTIFACT
         - every bundle clones and reports a HEAD
         - every git patch applies cleanly to the bundle it was taken against
         - every zip extracts to the correct repo-relative paths and the
           extracted bytes match the live files

      2. END-TO-END RESTORE
         For the newest set, rebuild the submodule working tree from scratch:
           clone the bundle -> apply the patch -> extract the zip
         then compare the result against the live submodule working tree:
         git status, tracked blob hashes, worktree presence, untracked bytes.

      3. PARENT REPO
         Clone the parent bundle and confirm its HEAD and its submodule
         gitlink match the live repository.

    Artifacts that are known to be broken but have a repaired sibling are
    reported as INFO rather than FAIL, so the report distinguishes "this
    artifact is unusable" from "the repair did not work".

    Exits non-zero if any check fails.

.PARAMETER BackupDir
    Directory holding the bundles, patches and zips.

.PARAMETER ScratchDir
    Scratch directory for the verification clones.

.PARAMETER LiveSubmodule
    Live submodule working tree to compare the restored tree against.

.PARAMETER LiveParent
    Live parent repository.
#>
[CmdletBinding()]
param(
    [string]$BackupDir = 'C:\Users\DOOM98\BACKUPS\GitBundles',
    [string]$ScratchDir = 'C:\Users\DOOM98\AppData\Local\Temp\opencode\verify',
    [string]$LiveSubmodule = 'C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE\doom-remote',
    [string]$LiveParent = 'C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE'
)

$ErrorActionPreference = 'Continue'

if (Test-Path -LiteralPath $ScratchDir) { Remove-Item -LiteralPath $ScratchDir -Recurse -Force }
New-Item -ItemType Directory -Path $ScratchDir -Force | Out-Null

$results = [System.Collections.Generic.List[object]]::new()
function Add-Result($Name, $Check, $Status, $Detail) {
    $results.Add([pscustomobject]@{ Artifact = $Name; Check = $Check; Status = $Status; Detail = $Detail })
}
function Get-Stamp($name) { [regex]::Match($name, '(\d{4}-\d{2}-\d{2}_\d{6})').Groups[1].Value }

function Get-Sha([string]$path) {
    (([System.Security.Cryptography.SHA256]::Create().ComputeHash(
        [System.IO.File]::ReadAllBytes($path))) | ForEach-Object { $_.ToString('x2') }) -join ''
}

# A patch belongs to exactly one bundle. Match by name, not just timestamp:
# the parent bundle and the submodule bundle share a timestamp.
function Resolve-TargetBundle([string]$patchName, [string[]]$bundleNames) {
    $stamp = Get-Stamp $patchName
    if (-not $stamp) { return @() }

    if ($patchName -match '^submodule_changes_') {
        return @($bundleNames | Where-Object { $_ -like "submodule_*_$stamp.bundle" })
    }

    # <name>_uncommitted_<stamp>.patch  ->  <name>_<stamp>.bundle
    $base = $patchName -replace '\.repaired\.patch$', '' -replace '\.patch$', ''
    $base = $base -replace '_uncommitted_.*$', ''
    return @($bundleNames | Where-Object { $_ -eq "${base}_$stamp.bundle" })
}

# ============================================================ 1. bundles ===
$cloneOf = @{}
$bundles = Get-ChildItem -LiteralPath $BackupDir -Filter '*.bundle' -File | Sort-Object Name

foreach ($b in $bundles) {
    $target = Join-Path $ScratchDir ("clone_" + $b.BaseName)
    & git clone --quiet $b.FullName $target 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Add-Result $b.Name 'clone' 'FAIL' 'clone failed'
        continue
    }
    $head = (& git -C $target rev-parse HEAD 2>&1 | Out-String).Trim()
    $files = (& git -C $target ls-tree -r HEAD --name-only 2>&1 | Measure-Object -Line).Lines
    $cloneOf[$b.Name] = $target
    Add-Result $b.Name 'clone' 'PASS' "HEAD=$head files=$files"
}

# ============================================================= 2. patches ===
$patchFiles = @()
$patchFiles += Get-ChildItem -LiteralPath $BackupDir -Filter '*.patch' -File |
               Where-Object { $_.Name -notlike '*.repaired.patch' }
$patchFiles += Get-ChildItem -LiteralPath $BackupDir -Filter '*.repaired.patch' -File

foreach ($p in ($patchFiles | Sort-Object Name)) {
    $text = [System.IO.File]::ReadAllText($p.FullName)

    if ($text -notmatch '(?m)^diff --git ') {
        $lines = @(Get-Content -LiteralPath $p.FullName | Where-Object { $_.Trim() -ne '' })
        Add-Result $p.Name 'format' 'INFO' "status report, not a diff ($($lines.Count) line(s))"
        continue
    }

    # @() is required: a function's return value is unrolled, so a single
    # match would arrive as a string and $targets[0] would index a character.
    $targets = @(Resolve-TargetBundle -patchName $p.Name -bundleNames @($cloneOf.Keys))
    if ($targets.Count -eq 0) {
        Add-Result $p.Name 'apply --check' 'SKIP' 'could not determine which bundle this patch belongs to'
        continue
    }
    $targetBundle = $targets[0]
    if (-not $cloneOf.ContainsKey($targetBundle)) {
        Add-Result $p.Name 'apply --check' 'SKIP' "no bundle named $targetBundle"
        continue
    }

    $out = & git -C $cloneOf[$targetBundle] apply --check $p.FullName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Result $p.Name 'apply --check' 'PASS' "applies to $targetBundle"
        continue
    }

    # Failed. If a repaired sibling exists, this is a known-broken original.
    $repaired = $null
    if ($p.Name -like '*.repaired.patch') {
        $repaired = $p
    }
    else {
        $candidate = Join-Path $BackupDir ($p.BaseName + '.repaired.patch')
        if (Test-Path -LiteralPath $candidate) { $repaired = Get-Item -LiteralPath $candidate }
    }

    if ($repaired) {
        $rOut = & git -C $cloneOf[$targetBundle] apply --check $repaired.FullName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Result $p.Name 'apply --check' 'INFO' "known-broken original; repaired copy $(Split-Path $repaired.Name -Leaf) applies cleanly"
            continue
        }
        Add-Result $p.Name 'apply --check' 'FAIL' "original fails AND repaired copy fails: $(($rOut | Out-String).Trim())"
        continue
    }

    Add-Result $p.Name 'apply --check' 'FAIL' (($out | Out-String).Trim())
}

# ============================================== 3. status-report artifacts ===
$statusFiles = Get-ChildItem -LiteralPath $BackupDir -Filter '*.repaired.status.txt' -File | Sort-Object Name
foreach ($s in $statusFiles) {
    $lines = @(Get-Content -LiteralPath $s.FullName | Where-Object { $_.Trim() -ne '' })
    Add-Result $s.Name 'readable' 'PASS' "$($lines.Count) status line(s): $(($lines | Select-Object -First 3) -join '; ')"
}

# ================================================================= 4. zips ===
Add-Type -AssemblyName System.IO.Compression.FileSystem

$liveUntracked = @()
if (Test-Path -LiteralPath $LiveSubmodule) {
    $liveUntracked = @(& git -C $LiveSubmodule ls-files --others --exclude-standard 2>&1 |
        ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$zipFiles = @()
$zipFiles += Get-ChildItem -LiteralPath $BackupDir -Filter '*.repaired.zip' -File
$zipFiles += Get-ChildItem -LiteralPath $BackupDir -Filter '*.zip' -File |
             Where-Object { $_.Name -notlike '*.repaired.zip' }

foreach ($z in ($zipFiles | Sort-Object Name)) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($z.FullName)
    $bad = @()
    $count = 0
    try {
        $entries = @($archive.Entries | Where-Object { $_.Length -gt 0 })
        $count = $entries.Count
        foreach ($e in $entries) {
            $rel = $e.FullName -replace '\\', '/'
            $livePath = Join-Path $LiveSubmodule ($rel -replace '/', '\')
            if (-not (Test-Path -LiteralPath $livePath)) { $bad += "$rel (no live file at this path)"; continue }
            $ms = New-Object System.IO.MemoryStream
            $s = $e.Open(); $s.CopyTo($ms); $s.Close()
            $zipSha = (([System.Security.Cryptography.SHA256]::Create().ComputeHash($ms.ToArray())) |
                       ForEach-Object { $_.ToString('x2') }) -join ''
            if ($zipSha -ne (Get-Sha $livePath)) { $bad += "$rel (hash mismatch)" }
        }
    }
    finally { $archive.Dispose() }

    if ($bad.Count -eq 0) {
        Add-Result $z.Name 'zip entries' 'PASS' "$count entries at correct paths, hashes match"
        continue
    }

    $repaired = $null
    if ($z.Name -like '*.repaired.zip') {
        $repaired = $z
    }
    else {
        $candidate = Join-Path $BackupDir ($z.BaseName + '.repaired.zip')
        if (Test-Path -LiteralPath $candidate) { $repaired = Get-Item -LiteralPath $candidate }
    }

    if ($repaired) {
        $rArchive = [System.IO.Compression.ZipFile]::OpenRead($repaired.FullName)
        $rBad = @()
        try {
            foreach ($e in @($rArchive.Entries | Where-Object { $_.Length -gt 0 })) {
                $rel = $e.FullName -replace '\\', '/'
                $livePath = Join-Path $LiveSubmodule ($rel -replace '/', '\')
                if (-not (Test-Path -LiteralPath $livePath)) { $rBad += "$rel (no live file)"; continue }
                $ms = New-Object System.IO.MemoryStream
                $s = $e.Open(); $s.CopyTo($ms); $s.Close()
                $zipSha = (([System.Security.Cryptography.SHA256]::Create().ComputeHash($ms.ToArray())) |
                           ForEach-Object { $_.ToString('x2') }) -join ''
                if ($zipSha -ne (Get-Sha $livePath)) { $rBad += "$rel (hash mismatch)" }
            }
        }
        finally { $rArchive.Dispose() }

        if ($rBad.Count -eq 0) {
            Add-Result $z.Name 'zip entries' 'INFO' "known-broken original ($($bad -join '; ')); repaired copy $(Split-Path $repaired.Name -Leaf) is correct"
            continue
        }
        Add-Result $z.Name 'zip entries' 'FAIL' "original bad AND repaired copy bad: $($rBad -join '; ')"
        continue
    }

    Add-Result $z.Name 'zip entries' 'FAIL' ($bad -join '; ')
}

# ================================================= 5. end-to-end restore ====
$newestSub = Get-ChildItem -LiteralPath $BackupDir -Filter 'submodule_doom-remote_*.bundle' -File |
             Sort-Object Name | Select-Object -Last 1
$newestStamp = Get-Stamp $newestSub.Name
$newestPatch = Join-Path $BackupDir "submodule_changes_$newestStamp.repaired.patch"
if (-not (Test-Path -LiteralPath $newestPatch)) {
    $newestPatch = Join-Path $BackupDir "submodule_changes_$newestStamp.patch"
}
$newestZip = Get-ChildItem -LiteralPath $BackupDir -Filter 'submodule_untracked_*.zip' -File |
             Sort-Object Name | Select-Object -Last 1

if ($newestSub -and (Test-Path -LiteralPath $newestPatch) -and $newestZip) {
    $restore = Join-Path $ScratchDir 'restored_submodule'
    & git clone --quiet $newestSub.FullName $restore 2>&1 | Out-Null

    $applyOut = & git -C $restore apply $newestPatch 2>&1
    if ($LASTEXITCODE -ne 0) {
        Add-Result 'end-to-end' 'apply patch' 'FAIL' (($applyOut | Out-String).Trim())
    }
    else {
        Add-Result 'end-to-end' 'apply patch' 'PASS' "applied $(Split-Path $newestPatch -Leaf)"

        $archive = [System.IO.Compression.ZipFile]::OpenRead($newestZip.FullName)
        try {
            foreach ($e in $archive.Entries) {
                if ($e.Length -eq 0) { continue }
                $dest = Join-Path $restore ($e.FullName -replace '\\', '\')
                $dir = Split-Path $dest -Parent
                if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
                $s = $e.Open()
                $fs = [System.IO.File]::Create($dest)
                $s.CopyTo($fs)
                $fs.Close(); $s.Close()
            }
        }
        finally { $archive.Dispose() }
        Add-Result 'end-to-end' 'extract zip' 'PASS' "extracted $(Split-Path $newestZip.FullName -Leaf)"

        $restoredStatus = @(& git -C $restore status --porcelain 2>&1 | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        $liveStatus = @(& git -C $LiveSubmodule status --porcelain 2>&1 | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        $statusDiff = @(Compare-Object $restoredStatus $liveStatus)
        if ($statusDiff.Count -eq 0) {
            Add-Result 'end-to-end' 'git status match' 'PASS' "$($liveStatus.Count) entries identical to live"
        }
        else {
            Add-Result 'end-to-end' 'git status match' 'FAIL' (($statusDiff | Out-String).Trim())
        }

        # Compare tracked content at the object level. Raw worktree bytes are
        # not comparable here: both repos have core.autocrlf=true, but the live
        # worktree was written with LF while a fresh clone checks out CRLF.
        # Git's clean filter normalises both, so compare index blob hashes and
        # separately confirm worktree presence matches.
        function Get-IndexMap([string]$repo) {
            $map = @{}
            & git -C $repo ls-files -s 2>&1 | ForEach-Object {
                $parts = $_ -split '\s+'
                if ($parts.Count -ge 4) { $map[$parts[3]] = $parts[1] }
            }
            return $map
        }

        $restoredIndex = Get-IndexMap $restore
        $liveIndex = Get-IndexMap $LiveSubmodule

        $blobMismatch = @()
        foreach ($rel in $restoredIndex.Keys) {
            if (-not $liveIndex.ContainsKey($rel)) { $blobMismatch += "$rel (missing from live index)"; continue }
            if ($restoredIndex[$rel] -ne $liveIndex[$rel]) { $blobMismatch += "$rel (blob differs)" }
        }
        foreach ($rel in $liveIndex.Keys) {
            if (-not $restoredIndex.ContainsKey($rel)) { $blobMismatch += "$rel (missing from restored index)" }
        }

        $presenceMismatch = @()
        foreach ($rel in $restoredIndex.Keys) {
            $r = Test-Path -LiteralPath (Join-Path $restore ($rel -replace '/', '\'))
            $l = Test-Path -LiteralPath (Join-Path $LiveSubmodule ($rel -replace '/', '\'))
            if ($r -ne $l) { $presenceMismatch += "$rel (restored=$r live=$l)" }
        }

        if ($blobMismatch.Count -eq 0 -and $presenceMismatch.Count -eq 0) {
            Add-Result 'end-to-end' 'tracked file contents' 'PASS' "$($restoredIndex.Count) tracked files: identical blobs and identical worktree presence"
        }
        else {
            Add-Result 'end-to-end' 'tracked file contents' 'FAIL' ("blobs: " + ($blobMismatch -join '; ') + " | presence: " + ($presenceMismatch -join '; '))
        }

        $restoredUntracked = @(& git -C $restore ls-files --others --exclude-standard 2>&1 |
            ForEach-Object { $_.Trim() } | Where-Object { $_ })
        $uMismatch = @()
        foreach ($rel in $restoredUntracked) {
            $r = Join-Path $restore ($rel -replace '/', '\')
            $l = Join-Path $LiveSubmodule ($rel -replace '/', '\')
            if (-not (Test-Path -LiteralPath $l)) { $uMismatch += "$rel (missing live)"; continue }
            if ((Get-Sha $r) -ne (Get-Sha $l)) { $uMismatch += "$rel (content differs)" }
        }
        if ($uMismatch.Count -eq 0 -and $restoredUntracked.Count -eq $liveUntracked.Count) {
            Add-Result 'end-to-end' 'untracked file contents' 'PASS' "$($restoredUntracked.Count) untracked files identical to live"
        }
        else {
            Add-Result 'end-to-end' 'untracked file contents' 'FAIL' ($uMismatch -join '; ')
        }
    }
}

# ========================================================== 6. parent repo ===
$newestParent = Get-ChildItem -LiteralPath $BackupDir -Filter 'doom-remote_*.bundle' -File |
                 Sort-Object Name | Select-Object -Last 1
if ($newestParent -and $cloneOf.ContainsKey($newestParent.Name)) {
    $pclone = $cloneOf[$newestParent.Name]
    $gitlink = (& git -C $pclone ls-tree HEAD doom-remote 2>&1 | Out-String).Trim()
    $liveGitlink = (& git -C $LiveParent ls-tree HEAD doom-remote 2>&1 | Out-String).Trim()
    $parentHead = (& git -C $pclone rev-parse HEAD 2>&1 | Out-String).Trim()
    $liveParentHead = (& git -C $LiveParent rev-parse HEAD 2>&1 | Out-String).Trim()

    if ($parentHead -eq $liveParentHead) {
        Add-Result 'parent repo' 'HEAD match' 'PASS' "HEAD=$parentHead matches live"
    }
    else {
        Add-Result 'parent repo' 'HEAD match' 'FAIL' "bundle=$parentHead live=$liveParentHead"
    }

    if ($gitlink -eq $liveGitlink) {
        Add-Result 'parent repo' 'submodule gitlink' 'PASS' "gitlink matches live: $gitlink"
    }
    else {
        Add-Result 'parent repo' 'submodule gitlink' 'FAIL' "bundle=$gitlink live=$liveGitlink"
    }
}

# ================================================================ report ===
$results | Format-Table -AutoSize -Wrap
$failures = @($results | Where-Object { $_.Status -eq 'FAIL' })
Write-Output ''
Write-Output ("PASS={0}  FAIL={1}  SKIP={2}  INFO={3}" -f
    @($results | Where-Object { $_.Status -eq 'PASS' }).Count,
    $failures.Count,
    @($results | Where-Object { $_.Status -eq 'SKIP' }).Count,
    @($results | Where-Object { $_.Status -eq 'INFO' }).Count)
if ($failures.Count -gt 0) { exit 1 }
