#!/usr/bin/env pwsh
Write-Host "=== AUDITING USER FOLDERS ON C: ===" -ForegroundColor Cyan
$dirs = @(
    "C:\Users\DOOM98\AI OS",
    "C:\Users\DOOM98\WORK",
    "C:\Users\DOOM98\PERSONAL",
    "C:\Users\DOOM98\PROJECTS",
    "C:\Users\DOOM98\INBOX",
    "C:\Users\DOOM98\BACKUPS",
    "C:\Users\DOOM98\SYSTEM-DOCS",
    "C:\Users\DOOM98\OpenWork Chat",
    "C:\Users\DOOM98\Documents",
    "C:\Users\DOOM98\Desktop",
    "C:\Users\DOOM98\Downloads"
)

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

Write-Host "`n=== GIT REPOSITORIES ===" -ForegroundColor Cyan
$repos = Get-ChildItem "C:\Users\DOOM98" -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName '.git') }
foreach ($repo in $repos) {
    $size = (Get-ChildItem $repo.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size/1MB, 2)
    $branch = git -C $repo.FullName branch --show-current 2>&1
    $status = git -C $repo.FullName status --porcelain 2>&1
    $uncommitted = ($status -split "`n" | Where-Object { $_ -ne '' }).Count
    Write-Host ("  {0}: {1} MB, Branch: {2}, Uncommitted: {3}" -f $repo.Name, $sizeMB, $branch, $uncommitted)
}

Write-Host "`n=== DISK SPACE ===" -ForegroundColor Cyan
Get-PSDrive C | Select-Object Name, 
    @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}, 
    @{Name="TotalGB";Expression={[math]::Round(($_.Used+$_.Free)/1GB,2)}}, 
    @{Name="Used%";Expression={[math]::Round((1-$_.Free/($_.Used+$_.Free))*100,1)}} | Format-Table -AutoSize