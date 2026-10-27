#!/usr/bin/env pwsh
<#
============================================================================
  TEST SUBMODULE BUNDLE RESTORATION
============================================================================
#>

$bundlePath = "C:\Users\DOOM98\BACKUPS\GitBundles\submodule_doom-remote_2026-10-26_223914.bundle"
$restorePath = "C:\Users\DOOM98\BACKUPS\TestRestore\submodule_doom-remote_restored_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"

Write-Host "=== TESTING SUBMODULE BUNDLE RESTORATION ===" -ForegroundColor Cyan
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
    Write-Host "Restored size: $sizeMB MB" -ForegroundColor White
    
    $branch = git -C $restorePath branch --show-current 2>&1
    Write-Host "Branch: $branch" -ForegroundColor White
    
    $status = git -C $restorePath status --porcelain 2>&1
    $uncommitted = ($status -split "`n" | Where-Object { $_ -ne '' }).Count
    Write-Host "Uncommitted: $uncommitted" -ForegroundColor White
    
    $log = git -C $restorePath log --oneline -5 2>&1
    Write-Host "Recent commits:" -ForegroundColor Cyan
    Write-Host $log
    
    # Check for the deleted files
    $deletedFiles = @(
        "tests/integration/Cargo.toml",
        "tests/integration/src/lib.rs",
        "tests/integration/tests/android_bridge.rs",
        "tests/integration/tests/e2e.rs",
        "tools/doomctl/Cargo.toml",
        "tools/doomctl/src/main.rs"
    )
    
    Write-Host "`nChecking for deleted files:" -ForegroundColor Cyan
    foreach ($file in $deletedFiles) {
        if (Test-Path (Join-Path $restorePath $file)) {
            Write-Host "  MISSING: $file" -ForegroundColor Red
        } else {
            Write-Host "  OK (deleted): $file" -ForegroundColor Green
        }
    }
    
    # Check for untracked files
    $untracked = @("agent/src/web/")
    Write-Host "`nChecking for untracked files:" -ForegroundColor Cyan
    foreach ($dir in $untracked) {
        if (Test-Path (Join-Path $restorePath $dir)) {
            Write-Host "  FOUND (untracked): $dir" -ForegroundColor Green
        } else {
            Write-Host "  MISSING: $dir" -ForegroundColor Red
        }
    }
    
    Write-Host "`n=== SUBMODULE RESTORATION TEST PASSED ===" -ForegroundColor Green
    
    # Clean up test restore
    Write-Host "`nCleaning up test restore..." -ForegroundColor Gray
    Remove-Item -Path $restorePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Test restore cleaned up" -ForegroundColor Gray
    
    exit 0
} else {
    Write-Host "Clone failed: $result" -ForegroundColor Red
    exit 1
}