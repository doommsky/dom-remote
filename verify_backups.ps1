#!/usr/bin/env pwsh
$backups = Get-ChildItem "C:\Users\DOOM98\BACKUPS\FileBackups" -File -Filter "*.zip"
foreach ($b in $backups) {
    $size = [math]::Round($b.Length/1MB, 2)
    Write-Host ("  {0}: {1} MB" -f $b.Name, $size)
    
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($b.FullName)
        Write-Host ("  {0}: {1} entries - OK" -f $b.Name, $zip.Entries.Count)
        $zip.Dispose()
    } catch {
        Write-Host ("  {0}: CORRUPT - {1}" -f $b.Name, $_.Exception.Message) -ForegroundColor Red
    }
}