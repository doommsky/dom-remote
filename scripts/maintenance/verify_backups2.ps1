#!/usr/bin/env pwsh
$backups = Get-ChildItem "C:\Users\DOOM98\BACKUPS\FileBackups" -File -Filter "*.zip"
foreach ($b in $backups) {
    $size = [math]::Round($b.Length/1MB, 2)
    Write-Host ("  {0}: {1} MB" -f $b.Name, $size)
    
    # Use COM object to verify zip
    try {
        $shell = New-Object -ComObject Shell.Application
        $zip = $shell.NameSpace($b.FullName)
        $count = $zip.Items().Count
        Write-Host ("  {0}: {1} items - OK" -f $b.Name, $count)
    } catch {
        Write-Host ("  {0}: CORRUPT - {1}" -f $b.Name, $_.Exception.Message) -ForegroundColor Red
    }
}