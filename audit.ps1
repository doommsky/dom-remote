#!/usr/bin/env pwsh
<#
============================================================================
  AUDIT REPOSITORIES AND STORAGE
============================================================================
#>

Write-Host "=== DISK SPACE ===" -ForegroundColor Cyan
Get-PSDrive C, E | Select-Object Name, 
    @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}, 
    @{Name="TotalGB";Expression={[math]::Round(($_.Used+$_.Free)/1GB,2)}}, 
    @{Name="Used%";Expression={[math]::Round((1-$_.Free/($_.Used+$_.Free))*100,1)}} | Format-Table -AutoSize

Write-Host "`n=== KEY DIRECTORIES ON C: ===" -ForegroundColor Cyan
$dirs = @(
    "C:\Users\DOOM98\OpenWork Chat",
    "C:\Users\DOOM98\Documents",
    "C:\Users\DOOM98\Desktop",
    "C:\Users\DOOM98\Downloads"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size/1MB, 2)
        $count = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host ("  {0}: {1} MB ({1} files)" -f $dir, $sizeMB, $count)
    } else {
        Write-Host ("  {0}: NOT FOUND" -f $dir) -ForegroundColor Yellow
    }
}

Write-Host "`n=== KEY DIRECTORIES ON E: ===" -ForegroundColor Cyan
$dirsE = @(
    "E:\AI-OPS",
    "E:\AI OS",
    "E:\AI-CORE",
    "E:\AI-TEAM-RUNNER",
    "E:\AgentRoom",
    "E:\Repos",
    "E:\WORK-FILES",
    "E:\WORK-APPS",
    "E:\DOM STORAGE",
    "E:\AI OS BACKUPS",
    "E:\open-cowork-main",
    "E:\odysseus-dev"
)

foreach ($dir in $dirsE) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size/1MB, 2)
        $count = (Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host ("  {0}: {1} MB ({1} files)" -f $dir, $sizeMB, $count)
    } else {
        Write-Host ("{0}: NOT FOUND" -f $dir) -ForegroundColor Yellow
    }
}

Write-Host "`n=== EXISTING BACKUPS ===" -ForegroundColor Cyan
$backupDirs = @("E:\AI OS BACKUPS")
foreach ($bd in $backupDirs) {
    if (Test-Path $bd) {
        $size = (Get-ChildItem $bd -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size/1MB, 2)
        $count = (Get-ChildItem $bd -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host ("  {0}: {1} MB ({1} files)" -f $bd, $sizeMB, $count)
    } else {
        Write-Host ("{0}: NOT FOUND" -f $bd) -ForegroundColor Yellow
    }
}

Write-Host "`n=== GIT REPOSITORIES ===" -ForegroundColor Cyan
$repos = Get-ChildItem "C:\", "E:\" -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName '.git') }
foreach ($repo in $repos) {
    $size = (Get-ChildItem $repo.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size/1MB, 2)
    $branch = git -C $repo.FullName branch --show-current 2>&1
    $status = git -C $repo.FullName status --porcelain 2>&1
    $uncommitted = ($status -split "`n" | Where-Object { $_ -ne '' }).Count
    Write-Host ("  {0}: {1} MB, Branch: {2}, Uncommitted: {3}" -f $repo.Name, $sizeMB, $branch, $uncommitted)
}