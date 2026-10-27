#!/usr/bin/env pwsh
<#
============================================================================
  AUTOMATION SCRIPT: Backup Critical Files
  Purpose: Backup important files to D:\AI OS BACKUPS
  Agent: LaptopAutomationAgent
============================================================================
#>

Write-Host "=== Critical Files Backup Automation ===" -ForegroundColor Cyan
Write-Host "Running backup at: $(Get-Date)" -ForegroundColor White

# Define critical files/folders to backup
$criticalItems = @(
    @{ Source = "D:\WORK-FILES"; DestFolder = "D:\AI OS BACKUPS\Work-Files" },
    @{ Source = "D:\Repos"; DestFolder = "D:\AI OS BACKUPS\Repos" },
    @{ Source = "C:\Users\DOOM98\Documents\Important"; DestFolder = "D:\AI OS BACKUPS\Documents" },
    @{ Source = "D:\DOM STORAGE"; DestFolder = "D:\AI OS BACKUPS\DOM-Storage" }
)

$backupCount = 0
$skippedCount = 0

foreach ($item in $criticalItems) {
    $destFolder = $item.DestFolder
    
    # Create destination folder if it doesn't exist
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
        Write-Host "  Created: $destFolder" -ForegroundColor Gray
    }
    
    # Copy items from source
    if (Test-Path $item.Source) {
        $files = Get-ChildItem $item.Source -Recurse -File -ErrorAction SilentlyContinue
        
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring($item.Source.Length + 1)
            $destFile = Join-Path $destFolder $relativePath
            
            # Create subfolders in destination
            $destDir = $destFile | Split-Path -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            try {
                Copy-Item -Path $file.FullName -Destination $destFile -Force -ErrorAction Stop
                $backupCount++
                Write-Host "  ✓ Backed up: $($file.Name)" -ForegroundColor Green
            } catch {
                $skippedCount++
                Write-Host "  ✗ Failed: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ⊘ Skipped: Source not found - $($item.Source)" -ForegroundColor Yellow
        $skippedCount++
    }
}

# Create a backup summary log
$summary = @{
    Timestamp = (Get-Date)
    TotalBackedUp = $backupCount
    TotalSkipped = $skippedCount
    ItemsProcessed = $criticalItems.Count
}

$summaryPath = "D:\AI OS BACKUPS\backup_summary_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$summary | ConvertTo-Json -Depth 2 | Out-File -FilePath $summaryPath -Encoding UTF8

Write-Host "`n=== Backup Complete ===" -ForegroundColor Cyan
Write-Host "Backed up: $backupCount files" -ForegroundColor Green
Write-Host "Skipped: $skippedCount items" -ForegroundColor Yellow
Write-Host "Summary saved to: $summaryPath" -ForegroundColor Gray