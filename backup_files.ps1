#!/usr/bin/env pwsh
<#
============================================================================
  BACKUP AUTOMATION - File Backups (WORK, PERSONAL, etc.)
  Purpose: Create versioned backups for important directories
============================================================================
#>

param(
    [string]$BackupRoot = "C:\Users\DOOM98\BACKUPS\FileBackups",
    [string]$LogPath = "C:\Users\DOOM98\BACKUPS\Logs\file_backup_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').log"
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

Write-Log "=== File Backup Started ===" -ForegroundColor Cyan
Write-Log "Backup Root: $BackupRoot" -ForegroundColor White
Write-Log "Log: $LogPath" -ForegroundColor White

# ============================================================================
# DIRECTORIES TO BACKUP (with exclusions)
# ============================================================================

$backupJobs = @(
    @{
        Name = "WORK"
        Source = "C:\Users\DOOM98\WORK"
        DestPrefix = "work"
        Exclusions = @(
            "*.tmp", "*.temp", "*.log", "*.cache",
            "node_modules", ".git", ".vs", "bin", "obj",
            "*.dll", "*.exe", "*.pdb",
            ".DS_Store", "Thumbs.db"
        )
    }
    @{
        Name = "PERSONAL"
        Source = "C:\Users\DOOM98\PERSONAL"
        DestPrefix = "personal"
        Exclusions = @(
            "*.tmp", "*.temp", "*.log", "*.cache",
            "*.dll", "*.exe", "*.pdb",
            ".DS_Store", "Thumbs.db",
            "*.iso", "*.vhd", "*.vhdx"
        )
    }
    @{
        Name = "PROJECTS"
        Source = "C:\Users\DOOM98\PROJECTS"
        DestPrefix = "projects"
        Exclusions = @(
            "*.tmp", "*.temp", "*.log", "*.cache",
            "node_modules", ".git", ".vs", "bin", "obj",
            "*.dll", "*.exe", "*.pdb",
            "node_modules", ".git", "*.lock"
        )
    }
    @{
        Name = "SYSTEM-DOCS"
        Source = "C:\Users\DOOM98\SYSTEM-DOCS"
        DestPrefix = "system-docs"
        Exclusions = @(
            "*.tmp", "*.temp", "*.log", "*.cache",
            "*.dll", "*.exe", "*.pdb",
            ".DS_Store", "Thumbs.db"
        )
    }
    @{
        Name = "INBOX"
        Source = "C:\Users\DOOM98\INBOX"
        DestPrefix = "inbox"
        Exclusions = @(
            "*.tmp", "*.temp", "*.log", "*.cache",
            "*.exe", "*.msi", "*.dmg"
        )
    }
)

$successCount = 0
$failCount = 0
$totalSizeMB = 0

foreach ($job in $backupJobs) {
    Write-Log "Processing: $($job.Name) from $($job.Source)" -ForegroundColor Cyan
    
    if (-not (Test-Path $job.Source)) {
        Write-Log "Source not found: $($job.Source) - skipping" -ForegroundColor Yellow
        continue
    }
    
    # Check if source has any files
    $fileCount = (Get-ChildItem $job.Source -Recurse -File -ErrorAction SilentlyContinue).Count
    if ($fileCount -eq 0) {
        Write-Log "No files to backup in $($job.Source) - skipping" -ForegroundColor Yellow
        continue
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    $zipName = "$($job.DestPrefix)_$timestamp.zip"
    $zipPath = Join-Path $BackupRoot $zipName
    
    # Build exclusion arguments for Compress-Archive
    $excludeArgs = @()
    foreach ($excl in $job.Exclusions) {
        $excludeArgs += "-Exclude"
        $excludeArgs += $excl
    }
    
    try {
        Write-Log "Creating archive: $zipName" -ForegroundColor Gray
        
        # Use Compress-Archive with exclusions
        $items = Get-ChildItem $job.Source -Recurse -File -ErrorAction SilentlyContinue | 
            Where-Object { 
                $match = $false
                foreach ($excl in $job.Exclusions) {
                    if ($_.Name -like $excl -or $_.FullName -like "*$excl*") {
                        $match = $true
                        break
                    }
                }
                -not $match
            }
        
        if ($items.Count -eq 0) {
            Write-Log "No files after exclusions - skipping" -ForegroundColor Yellow
            continue
        }
        
        $items | Compress-Archive -DestinationPath $zipPath -CompressionLevel Optimal -Force
        
        if (Test-Path $zipPath) {
            $zipSize = (Get-Item $zipPath).Length
            $sizeMB = [math]::Round($zipSize/1MB, 2)
            $totalSizeMB += $sizeMB
            Write-Log "Archive created: $zipName ($sizeMB MB)" -ForegroundColor Green
            
            # Verify zip
            try {
                $test = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
                $entryCount = $test.Entries.Count
                $test.Dispose()
                Write-Log "Archive verified: $entryCount entries" -ForegroundColor Green
            } catch {
                Write-Log "Archive verification failed: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            $successCount++
        } else {
            Write-Log "Archive creation failed" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Log "Exception: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

Write-Log "`n=== FILE BACKUP SUMMARY ===" -ForegroundColor Cyan
Write-Log "Successful: $successCount" -ForegroundColor Green
Write-Log "Failed: $failCount" -ForegroundColor Red
Write-Log "Total size: $([math]::Round($totalSizeMB, 2)) MB" -ForegroundColor White
Write-Log "Log saved to: $LogPath" -ForegroundColor White

exit (if ($failCount -gt 0) { 1 } else { 0 })