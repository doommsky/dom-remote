$files = Get-ChildItem 'D:\Repos' -Recurse -File -ErrorAction SilentlyContinue
$size = ($files | Measure-Object -Property Length -Sum).Sum
[PSCustomObject]@{
    Count = $files.Count
    SizeMB = [math]::Round($size/1MB, 2)
}