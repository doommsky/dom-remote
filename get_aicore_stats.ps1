$files = Get-ChildItem 'D:\AI-CORE' -Recurse -File -ErrorAction SilentlyContinue
$size = ($files | Measure-Object -Property Length -Sum).Sum
[PSCustomObject]@{
    Count = $files.Count
    SizeGB = [math]::Round($size/1GB, 2)
}