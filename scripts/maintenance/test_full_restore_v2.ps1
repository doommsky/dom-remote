#!/usr/bin/env pwsh
<#
============================================================================
  TEST FULL RESTORE WITH PATCH APPLICATION (v2)
============================================================================
#>

$bundlePath = "C:\Users\DOOM98\BACKUPS\GitBundles\submodule_doom-remote_2026-10-26_224254.bundle"
$patchPath = "C:\Users\DOOM98\BACKUPS\GitBundles\submodule_changes_2026-10-26_224254.patch"
$restorePath = "C:\Users\DOOM98\BACKUPS\TestRestore\submodule_doom-remote_full_restore_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"

Write-Host "=== TESTING FULL RESTORE WITH PATCH ===" -ForegroundColor Cyan
Write-Host "Bundle: $bundlePath" -ForegroundColor White
Write-Host "Patch: $patchPath" -ForegroundColor White
Write-Host "Restore to: $restorePath" -ForegroundColor White

if (-not (Test-Path $bundlePath)) {
    Write-Host "Bundle not found: $bundlePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $patchPath)) {
    Write-Host "Patch not found: $patchPath" -ForegroundColor Red
    exit 1
}

# Create restore directory
New-Item -ItemType Directory -Path $restorePath -Force | Out-Null

# Clone from bundle
Write-Host "Cloning from bundle..." -ForegroundColor Cyan
$result = git clone $bundlePath $restorePath 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Clone failed: $result" -ForegroundColor Red
    exit 1
}

Write-Host "Clone successful!" -ForegroundColor Green

# Apply the patch
Write-Host "Applying patch..." -ForegroundColor Cyan
$patchResult = git -C $restorePath apply "C:\Users\DOOM98\BACKUPS\GitBundles\submodule_changes_2026-10-26_224254.patch" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Patch applied successfully!" -ForegroundColor Green
} else {
    Write-Host "Patch apply failed: $patchResult" -ForegroundColor Red
    Write-Host "Trying with --reject..." -ForegroundColor Yellow
    $rejectResult = git -C $restorePath apply --reject "C:\Users\DOOM98\BACKUPS\GitBundles\submodule_changes_2026-10-26_224254.patch" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Patch applied with rejects" -ForegroundColor Yellow
    } else {
        Write-Host "Patch apply with rejects also failed: $rejectResult" -ForegroundColor Red
    }
}

# Check for deleted files
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
        Write-Host "  MISSING (should be deleted): $file" -ForegroundColor Red
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

# Check git status
$status = git -C $restorePath status --porcelain 2>&1
Write-Host "`nGit status after patch:" -ForegroundColor Cyan
Write-Host $status

Write-Host "`n=== FULL RESTORE TEST COMPLETE ===" -ForegroundColor Green

# Clean up test restore
Write-Host "`nCleaning up test restore..." -ForegroundColor Gray
Remove-Item -Path $restorePath -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Test restore cleaned up" -ForegroundColor Gray

exit 0