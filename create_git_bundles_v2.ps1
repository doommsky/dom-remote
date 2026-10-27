#!/usr/bin/env pwsh
<#
============================================================================
  BACKUP AUTOMATION - Git Recovery Bundles (Enhanced)
  Purpose: Create versioned Git bundles for confirmed repositories with full submodule support
============================================================================
#>

param(
    [string]$BackupRoot = "C:\Users\DOOM98\BACKUPS\GitBundles",
    [string]$LogPath = "C:\Users\DOOM98\BACKUPS\Logs\git_bundle_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').log"
)

# Ensure backup directories exist
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $LogPath) -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $color = "White"
    if ($Level -eq "INFO") { $color = "Cyan" }
    elseif ($Level -eq "WARN") { $color = "Yellow" }
    elseif ($Level -eq "ERROR") { $color = "Red" }
    elseif ($Level -eq "SUCCESS") { $color = "Green" }
    $entry = "[$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')] [$Level] $Message"
    $entry | Out-File -FilePath $LogPath -Append -Encoding UTF8
    Write-Host $Message -ForegroundColor $color
}

function Get-GitRepoInfo {
    param([string]$RepoPath)
    $info = @{
        Path = $RepoPath
        Name = (Split-Path $RepoPath -Leaf)
        HasSubmodules = $false
        Submodules = @()
        UncommittedChanges = @()
        UntrackedFiles = @()
    }
    
    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        return $null
    }
    
    # Get submodules
    $submodules = git -C $RepoPath submodule status 2>&1
    if ($LASTEXITCODE -eq 0 -and $submodules) {
        $info.HasSubmodules = $true
        foreach ($line in $submodules -split "`n") {
            if ($line -match '^[\s\-]?([a-f0-9]+)\s+(\S+)\s*(.*)') {
                $hash = $matches[1]
                $path = $matches[2]
                $info.Submodules += @{
                    Path = $path
                    Hash = $hash
                    FullPath = Join-Path $RepoPath $path
                }
            }
        }
    }
    
    # Get uncommitted changes in main repo
    $status = git -C $RepoPath status --porcelain 2>&1
    if ($LASTEXITCODE -eq 0 -and $status) {
        foreach ($line in $status -split "`n") {
            if ($line -match '^(\S\S)\s+(.+)') {
                $info.UncommittedChanges += @{
                    Status = $matches[1]
                    File = $matches[2]
                }
            }
        }
    }
    
    # Get untracked files
    $untracked = git -C $RepoPath ls-files --others --exclude-standard 2>&1
    if ($LASTEXITCODE -eq 0 -and $untracked) {
        foreach ($file in $untracked -split "`n") {
            if ($file) {
                $info.UntrackedFiles += $file
            }
        }
    }
    
    return $info
}

function Get-SubmoduleChanges {
    param([string]$SubmodulePath)
    $changes = @{
        Staged = @()
        Unstaged = @()
        Untracked = @()
        Deleted = @()
    }
    
    if (-not (Test-Path (Join-Path $SubmodulePath ".git"))) {
        return $null
    }
    
    # Get status
    $status = git -C $SubmodulePath status --porcelain 2>&1
    if ($LASTEXITCODE -eq 0 -and $status) {
        foreach ($line in $status -split "`n") {
            if ($line -match '^(\S\S)\s+(.+)') {
                $statusCode = $matches[1]
                $file = $matches[2]
                switch ($statusCode[0]) {
                    'M' { $changes.Unstaged += $file }
                    'A' { $changes.Staged += $file }
                    'D' { $changes.Deleted += $file }
                    '?' { $changes.Untracked += $file }
                    default { $changes.Unstaged += $file }
                }
            }
        }
    }
    
    return $changes
}

function Create-SubmoduleBundle {
    param([string]$SubmodulePath, [string]$BackupRoot, [string]$BundleName, [string]$Timestamp)
    
    $bundleName = "submodule_$($SubmodulePath.Split('\')[-1])_$Timestamp.bundle"
    $bundlePath = Join-Path $BackupRoot $bundleName
    
    try {
        $result = git -C $SubmodulePath bundle create $bundlePath --all 2>&1
        if ($LASTEXITCODE -eq 0) {
            $bundleSize = (Get-Item $bundlePath).Length
            $sizeMB = [math]::Round($bundleSize/1MB, 2)
            return @{
                Success = $true
                BundlePath = $bundlePath
                SizeMB = $sizeMB
            }
        } else {
            return @{ Success = $false; Error = $result }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Capture-SubmoduleChanges {
    param([string]$SubmodulePath, [string]$BackupRoot, [string]$Timestamp)
    
    $changes = Get-SubmoduleChanges -SubmodulePath $SubmodulePath
    if (-not $changes) {
        return @{ Success = $false; Error = "Not a valid git repository" }
    }
    
    $hasChanges = $changes.Staged.Count -gt 0 -or $changes.Unstaged.Count -gt 0 -or $changes.Untracked.Count -gt 0 -or $changes.Deleted.Count -gt 0
    
    if (-not $hasChanges) {
        return @{ Success = $true; HasChanges = $false }
    }
    
    $patchFile = "submodule_changes_$Timestamp.patch"
    $patchPath = Join-Path $BackupRoot $patchFile
    
    # Create a comprehensive patch file
    $patchContent = "# Submodule Changes Patch`n"
    $patchContent += "# Generated: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')`n"
    $patchContent += "# Submodule: $SubmodulePath`n`n"
    
    if ($changes.Staged.Count -gt 0) {
        $patchContent += "## Staged Changes`n"
        foreach ($file in $changes.Staged) {
            $patchContent += "A  $file`n"
        }
        $patchContent += "`n"
    }
    
    if ($changes.Unstaged.Count -gt 0) {
        $patchContent += "## Unstaged Changes`n"
        foreach ($file in $changes.Unstaged) {
            $patchContent += "M  $file`n"
        }
        $patchContent += "`n"
    }
    
    if ($changes.Deleted.Count -gt 0) {
        $patchContent += "## Deleted Files`n"
        foreach ($file in $changes.Deleted) {
            $patchContent += "D  $file`n"
        }
        $patchContent += "`n"
    }
    
    if ($changes.Untracked.Count -gt 0) {
        $patchContent += "## Untracked Files`n"
        foreach ($file in $changes.Untracked) {
            $patchContent += "?  $file`n"
        }
        $patchContent += "`n"
    }
    
    # Also create a full diff for staged/unstaged changes
    $diff = git -C $SubmodulePath diff HEAD 2>&1
    if ($LASTEXITCODE -eq 0 -and $diff) {
        $patchContent += "## Full Diff (HEAD)`n"
        $patchContent += $diff + "`n"
    }
    
    $unstagedDiff = git -C $SubmodulePath diff 2>&1
    if ($LASTEXITCODE -eq 0 -and $unstagedDiff) {
        $patchContent += "## Unstaged Diff`n"
        $patchContent += $unstagedDiff + "`n"
    }
    
    # Save patch
    $patchContent | Out-File -FilePath (Join-Path $BackupRoot $patchFile) -Encoding UTF8
    
    # Also save untracked files as a tar archive if any
    if ($changes.Untracked.Count -gt 0) {
        $untrackedArchive = "submodule_untracked_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').tar"
        $untrackedPath = Join-Path $BackupRoot $untrackedArchive
        
        # Create tar of untracked files
        $untrackedFiles = $changes.Untracked | ForEach-Object { Join-Path $SubmodulePath $_ }
        if ($untrackedFiles.Count -gt 0) {
            try {
                $untrackedFiles | Compress-Archive -DestinationPath (Join-Path $BackupRoot "submodule_untracked_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').zip") -Force
            } catch {
                Write-Warning "Failed to archive untracked files: $($_.Exception.Message)"
            }
        }
    }
    
    return @{
        Success = $true
        HasChanges = $true
        PatchFile = $patchFile
        Changes = $changes
    }
}

# ============================================================================
# MAIN BACKUP LOGIC
# ============================================================================

# Ensure backup directories exist
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $LogPath) -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $color = "White"
    if ($Level -eq "INFO") { $color = "Cyan" }
    elseif ($Level -eq "WARN") { $color = "Yellow" }
    elseif ($Level -eq "ERROR") { $color = "Red" }
    elseif ($Level -eq "SUCCESS") { $color = "Green" }
    $entry = "[$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')] [$Level] $Message"
    $entry | Out-File -FilePath $LogPath -Append -Encoding UTF8
    Write-Host $Message -ForegroundColor $color
}

Write-Log "=== Git Bundle Backup Started (Enhanced) ===" -ForegroundColor Cyan
Write-Log "Backup Root: $BackupRoot" -ForegroundColor White
Write-Log "Log: $LogPath" -ForegroundColor White

# ============================================================================
# CONFIRMED REPOSITORIES TO BACKUP
# ============================================================================

$repos = @(
    @{
        Name = "DOOM REMOTE"
        Path = "C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE"
        BundleName = "doom-remote"
    }
)

$successCount = 0
$failCount = 0

foreach ($repo in $repos) {
    Write-Log "Processing: $($repo.Name) at $($repo.Path)" -ForegroundColor Cyan
    
    if (-not (Test-Path $repo.Path)) {
        Write-Log "Repository not found: $($repo.Path)" -ForegroundColor Red
        $failCount++
        continue
    }
    
    if (-not (Test-Path (Join-Path $repo.Path ".git"))) {
        Write-Log "Not a Git repository: $($repo.Path)" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Get repo info including submodules
    $repoInfo = Get-GitRepoInfo -RepoPath $repo.Path
    if (-not $repoInfo) {
        Write-Log "Failed to get repo info: $($repo.Path)" -ForegroundColor Red
        $failCount++
        continue
    }
    
    Write-Log "Repository: $($repoInfo.Name)" -ForegroundColor White
    Write-Log "  Submodules: $($repoInfo.Submodules.Count)" -ForegroundColor Gray
    Write-Log "  Uncommitted changes: $($repoInfo.UncommittedChanges.Count)" -ForegroundColor Gray
    Write-Log "  Untracked files: $($repoInfo.UntrackedFiles.Count)" -ForegroundColor Gray
    
    # Create versioned bundle name
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $bundleName = "$($repo.BundleName)_$timestamp.bundle"
    $bundlePath = Join-Path $BackupRoot $bundleName
    
    # Create Git bundle (all refs, all history)
    try {
        Write-Log "Creating bundle: $bundleName" -ForegroundColor Gray
        $result = git -C $repo.Path bundle create $bundlePath --all 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $bundleSize = (Get-Item $bundlePath).Length
            $sizeMB = [math]::Round($bundleSize/1MB, 2)
            Write-Log "Bundle created: $bundleName ($sizeMB MB)" -ForegroundColor Green
            
            # Verify bundle
            $verify = git -C $repo.Path bundle verify $bundlePath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Bundle verified successfully" -ForegroundColor Green
            } else {
                Write-Log "Bundle verification failed: $verify" -ForegroundColor Red
            }
            
            # Save uncommitted changes in main repo
            $status = git -C $repo.Path status --porcelain 2>&1
            if ($status) {
                $changesFile = Join-Path $BackupRoot "$($repo.BundleName)_uncommitted_$timestamp.patch"
                $status | Out-File -FilePath $changesFile -Encoding UTF8
                Write-Log "Main repo uncommitted changes saved" -ForegroundColor Yellow
            }
            
            # Process submodules
            foreach ($submodule in $repoInfo.Submodules) {
                Write-Log "Processing submodule: $($submodule.Path)" -ForegroundColor Cyan
                
                # Create submodule bundle
                $subBundleResult = Create-SubmoduleBundle -SubmodulePath $submodule.FullPath -BackupRoot $BackupRoot -BundleName $repo.BundleName -Timestamp $timestamp
                if ($subBundleResult.Success) {
                    Write-Log "Submodule bundle created: $($submodule.Path) ($($subBundleResult.SizeMB) MB)" -ForegroundColor Green
                } else {
                    Write-Log "Submodule bundle failed: $($submodule.Path) - $($subBundleResult.Error)" -ForegroundColor Red
                }
                
                # Capture submodule changes
                $subChanges = Capture-SubmoduleChanges -SubmodulePath $submodule.FullPath -BackupRoot $BackupRoot -Timestamp $timestamp
                if ($subChanges.Success -and $subChanges.HasChanges) {
                    Write-Log "Submodule changes captured: $($subChanges.PatchFile)" -ForegroundColor Yellow
                }
            }
            
            # Save main repo uncommitted changes
            $status = git -C $repo.Path status --porcelain 2>&1
            if ($status) {
                $changesFile = Join-Path $BackupRoot "$($repo.BundleName)_uncommitted_$timestamp.patch"
                $status | Out-File -FilePath $changesFile -Encoding UTF8
                Write-Log "Main repo uncommitted changes saved" -ForegroundColor Yellow
            }
            
            $successCount++
        } else {
            Write-Log "Bundle creation failed: $result" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Log "Exception: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

Write-Log "`n=== BACKUP SUMMARY ===" -ForegroundColor Cyan
Write-Log "Successful: $successCount" -ForegroundColor Green
Write-Log "Failed: $failCount" -ForegroundColor Red
Write-Log "Log saved to: $LogPath" -ForegroundColor White

exit (if ($failCount -gt 0) { 1 } else { 0 })