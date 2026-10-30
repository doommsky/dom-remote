#!/usr/bin/env pwsh
<#
============================================================================
  TEST GIT BUNDLE RESTORATION
  Purpose: Test restoring a Git bundle in an isolated temp directory
============================================================================
#>

$bundlePath = "C:\Users\DOOM98\BACKUPS\GitBundles\doom-remote_2026-10-26_221305.bundle"
$restorePath = "C:\Users\DOOM98\BACKUPS\TestRestore\doom-remote_restored_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"

Write-Host "=== TESTING GIT BUNDLE RESTORATION ===" -ForegroundColor Cyan
Write-Host "Bundle: $bundlePath" -ForegroundColor White
Write-Host "Restore to: $restorePath" -ForegroundColor White

if (-not (Test-Path $bundlePath)) {
    Write-Host "Bundle not found: $bundlePath" -ForegroundColor Red
    exit 1
}

# Create restore directory
New-Item -ItemType Directory -Path $restorePath -Force | Out-Null

# Clone from bundle
Write-Host "Cloning from bundle..." -ForegroundColor Cyan
$result = git clone $bundlePath $restorePath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Clone successful!" -ForegroundColor Green
    
    # Verify restored repo
    $restoredSize = (Get-ChildItem $restorePath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($restoredSize/1MB, 2)
    Write-Host ("Restored size: {0} MB" -f [math]::Round($restoredSize/1MB, 2)) -ForegroundColor White
    
    $branch = git -C $restorePath branch --show-current 2>&1
    Write-Host ("Branch: {0}" -f $branch) -ForegroundColor White
    
    $status = git -C $restorePath status --porcelain 2>&1
    $uncommitted = ($status -split "`n" | Where-Object { $_ -ne '' }).Count
    Write-Host ("Uncommitted: {0}" -f $uncommitted) -ForegroundColor White
    
    $log = git -C $restorePath log --oneline -5 2>&1
    Write-Host "Recent commits:" -ForegroundColor Cyan
    Write-Host $log
    
    Write-Host "`n=== RESTORATION TEST PASSED ===" -ForegroundColor Green
    
    # Clean up test restore
    Write-Host "`nCleaning up test restore..." -ForegroundColor Gray
    Remove-Item -Path $restorePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Test restore cleaned up" -ForegroundColor Gray
    
    exit 0
} else {
    Write-Host "Clone failed: $result" -ForegroundColor Red
    exit 1
}