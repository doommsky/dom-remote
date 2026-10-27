#!/usr/bin/env pwsh
$bundle = "C:\Users\DOOM98\BACKUPS\GitBundles\doom-remote_2026-10-26_221305.bundle"
if (Test-Path $bundle) {
    $size = (Get-Item $bundle).Length
    $sizeMB = [math]::Round($size/1MB, 2)
    Write-Host ("Bundle exists: {0} ({1} MB)" -f $bundle, $sizeMB) -ForegroundColor Green
    
    $verify = git bundle verify $bundle 2>&1
    Write-Host ("Verification: {0}" -f $verify) -ForegroundColor Green
    
    $refs = git bundle list-heads $bundle 2>&1
    Write-Host "Refs in bundle:" -ForegroundColor Cyan
    Write-Host $refs
} else {
    Write-Host "Bundle not found" -ForegroundColor Red
}