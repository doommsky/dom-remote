$folders = @(
    "D:\AI OS",
    "D:\AI-CORE",
    "D:\Repos",
    "D:\DOM STORAGE",
    "D:\AI OS BACKUPS"
)

foreach ($path in $folders) {
    if (Test-Path $path) {
        Write-Host "=== Nested backups in $path ==="
        $nested = Get-ChildItem $path -Directory -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -like "*backup*" -or $_.Name -like "*BACKUP*" -or $_.Name -like "*Backup*" } |
            Select-Object FullName, LastWriteTime
        if ($nested) {
            $nested | Format-Table FullName, LastWriteTime -AutoSize | Out-Host
        } else {
            Write-Host "(none found)"
        }
        Write-Host ""
    }
}