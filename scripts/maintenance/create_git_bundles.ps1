#!/usr/bin/env pwsh
<#
============================================================================
  BACKUP AUTOMATION - Git Recovery Bundles
  Purpose: Create versioned Git bundles for confirmed repositories
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

Write-Log "=== Git Bundle Backup Started ===" -ForegroundColor Cyan
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
    # Add more repositories here as they are confirmed
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
            
            # Save uncommitted changes separately
            $status = git -C $repo.Path status --porcelain 2>&1
            if ($status) {
                $changesFile = Join-Path $BackupRoot "$($repo.BundleName)_uncommitted_$timestamp.patch"
                $status | Out-File -FilePath $changesFile -Encoding UTF8
                Write-Log "Uncommitted changes saved: $($changesFile)" -ForegroundColor Yellow
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