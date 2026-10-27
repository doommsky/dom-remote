#!/usr/bin/env pwsh
$repo = "C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE"
$size = (Get-ChildItem $repo -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($size/1MB, 2)
$branch = git -C $repo branch --show-current 2>&1
$status = git -C $repo status --porcelain 2>&1
$uncommitted = ($status -split "`n" | Where-Object { $_ -ne '' }).Count
Write-Host ("  {0}: {1} MB, Branch: {2}, Uncommitted: {3}" -f (Split-Path $repo -Leaf), $sizeMB, $branch, $uncommitted)