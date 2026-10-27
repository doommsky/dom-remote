#!/usr/bin/env pwsh
<#
============================================================================
  BACKUP AUTOMATION - Master Script
  Purpose: Run all backup jobs (Git bundles + File backups)
  Schedule: Weekly for Git, Monthly for Files
============================================================================
#>

param(
    [ValidateSet("Weekly", "Monthly")]
    [string]$Schedule = "Weekly",
    
    [switch]$Force
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$scriptDir = Split-Path $MyInvocation.MyCommand.Path
$gitBundleScript = Join-Path $scriptDir "create_git_bundles.ps1"
$fileBackupScript = Join-Path $scriptDir "backup_files.ps1"

Write-Host "=== AI-OPS BACKUP AUTOMATION ===" -ForegroundColor Cyan
Write-Host "Schedule: $Schedule" -ForegroundColor White
Write-Host "Time: $(Get-Date)" -ForegroundColor White

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

# Check disk space
$freeGB = (Get-PSDrive C).Free / 1GB
if ($freeGB -lt 10) {
    Write-Host "ERROR: Less than 10 GB free on C: ($([math]::Round($freeGB,1)) GB free)" -ForegroundColor Red
    exit 1
}

Write-Host "Disk space OK: $([math]::Round($freeGB,1)) GB free" -ForegroundColor Green

# Check Git availability
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git not found in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Git available: $(git --version)" -ForegroundColor Green

# ============================================================================
# EXECUTE BACKUP JOBS
# ============================================================================

$overallSuccess = $true

# Weekly: Git bundles
if ($Schedule -eq "Weekly" -or $Force) {
    Write-Host "`n=== RUNNING GIT BUNDLE BACKUP ===" -ForegroundColor Cyan
    $result = & powershell -ExecutionPolicy Bypass -File "create_git_bundles.ps1"
    $gitExitCode = $LASTEXITCODE
    
    if ($gitExitCode -eq 0) {
        Write-Host "Git bundle backup: SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "Git bundle backup: FAILED (exit code $gitExitCode)" -ForegroundColor Red
        $overallSuccess = $false
    }
}

# Monthly: File backups
if ($Schedule -eq "Monthly" -or $Force) {
    Write-Host "`n=== RUNNING FILE BACKUP ===" -ForegroundColor Cyan
    $result = & powershell -ExecutionPolicy Bypass -File "backup_files.ps1"
    $fileExitCode = $LASTEXITCODE
    
    if ($fileExitCode -eq 0) {
        Write-Host "File backup: SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "File backup: FAILED (exit code $fileExitCode)" -ForegroundColor Red
        $overallSuccess = $false
    }
}

# ============================================================================
# POST-BACKUP VERIFICATION
# ============================================================================

Write-Host "`n=== POST-BACKUP VERIFICATION ===" -ForegroundColor Cyan

# Verify Git bundles
$bundles = Get-ChildItem "C:\Users\DOOM98\BACKUPS\GitBundles" -File -Filter "*.bundle" | Sort-Object LastWriteTime -Descending
if ($bundles.Count -gt 0) {
    $latest = $bundles[0]
    $verify = git bundle verify $latest.FullName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Latest Git bundle verified: $($latest.Name)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Latest Git bundle verification failed" -ForegroundColor Yellow
    }
}

# Verify file backups
$fileBackups = Get-ChildItem "C:\Users\DOOM98\BACKUPS\FileBackups" -File -Filter "*.zip" | Sort-Object LastWriteTime -Descending
if ($fileBackups.Count -gt 0) {
    foreach ($zip in $fileBackups | Select-Object -First 3) {
        try {
            $shell = New-Object -ComObject Shell.Application
            $zip = $shell.NameSpace($zip.FullName)
            Write-Host "Verified: $($zip.Name) - $($zip.Items().Count) items" -ForegroundColor Green
        } catch {
            Write-Host "WARNING: $($zip.Name) verification failed" -ForegroundColor Yellow
        }
    }
}

# ============================================================================
# CLEANUP OLD BACKUPS (Retention Policy)
# ============================================================================

Write-Host "`n=== RETENTION CLEANUP ===" -ForegroundColor Cyan

# Git bundles: keep 12 weekly, 12 monthly, 5 yearly
# For now, just report what would be cleaned
$bundles = Get-ChildItem "C:\Users\DOOM98\BACKUPS\GitBundles" -File -Filter "*.bundle" | Sort-Object LastWriteTime
Write-Host "Git bundles: $($bundles.Count) total" -ForegroundColor White

$fileBackups = Get-ChildItem "C:\Users\DOOM98\BACKUPS\FileBackups" -File -Filter "*.zip" | Sort-Object LastWriteTime
Write-Host "File backups: $($fileBackups.Count) total" -ForegroundColor White

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host "`n=== BACKUP AUTOMATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date)" -ForegroundColor White
Write-Host "Schedule: $Schedule" -ForegroundColor White

exit 0