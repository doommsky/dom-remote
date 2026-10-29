$folders = Get-ChildItem 'D:\AI OS BACKUPS\AI OS 2026-10-21_1132' -Directory
$results = @()
foreach ($folder in $folders) {
    $files = Get-ChildItem $folder.FullName -Recurse -File -ErrorAction SilentlyContinue
    $size = ($files | Measure-Object -Property Length -Sum).Sum
    $results += [PSCustomObject]@{
        Name = $folder.Name
        Files = $files.Count
        SizeMB = [math]::Round($size/1MB, 2)
    }
}
$results | Format-Table -AutoSize