#!/usr/bin/env pwsh
Write-Host "=== CHECKING C: FOR AI FOLDERS ===" -ForegroundColor Cyan
$dirs = @("C:\AI-OPS", "C:\AI OS", "C:\AI-CORE", "C:\AI-TEAM-RUNNER", "C:\AgentRoom", "C:\Repos", "C:\WORK-FILES", "C:\WORK-APPS", "C:\DOM STORAGE", "C:\AI OS BACKUPS", "C:\open-cowork-main", "C:\odysseus-dev")
foreach ($d in $dirs) {
    if (Test-Path $d) {
        $size = (Get-ChildItem $d -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size/1MB, 2)
        $count = (Get-ChildItem $d -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host ("  {0}: {1} MB ({1} files)" -f $d, $sizeMB, $count)
    } else {
        Write-Host ("{0}: NOT FOUND" -f $d) -ForegroundColor Yellow
    }
}