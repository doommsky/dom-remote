#!/usr/bin/env pwsh
Write-Host "=== CHECKING OPENWORK CHAT FOR GIT REPOS ===" -ForegroundColor Cyan
$repos = Get-ChildItem "C:\Users\DOOM98\OpenWork Chat" -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName '.git') }
foreach ($repo in $repos) {
    $size = (Get-ChildItem $repo.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size/1MB, 2)
    $branch = git -C $repo.FullName branch --show-current 2>&1
    $status = git -C $repo.FullName status --porcelain 2>&1
    $uncommitted = ($status -split "`n" | Where-Object { $_ -ne '' }).Count
    Write-Host ("  {0}: {1} MB, Branch: {2}, Uncommitted: {3}" -f $repo.Name, $sizeMB, $branch, $uncommitted)
}