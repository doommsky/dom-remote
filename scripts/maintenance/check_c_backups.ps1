$files = Get-ChildItem 'C:\Users\DOOM98\BACKUPS' -Recurse -File -ErrorAction SilentlyContinue
$size = ($files | Measure-Object -Property Length -Sum).Sum
[PSCustomObject]@{
    Count = $files.Count
    SizeGB = [math]::Round($size/1GB, 2)
    SizeMB = [math]::Round($size/1MB, 2)
}