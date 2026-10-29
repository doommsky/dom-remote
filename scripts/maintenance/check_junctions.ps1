$folders = @(
    "D:\AI OS",
    "D:\AI-CORE",
    "D:\Repos",
    "D:\AI-TEAM-RUNNER",
    "D:\AgentRoom",
    "D:\odysseus-dev",
    "D:\open-cowork-main",
    "D:\OS AI OPEN DESIGN",
    "D:\DOM STORAGE",
    "D:\WORK-FILES",
    "D:\WORK-APPS",
    "D:\AI OS BACKUPS",
    "D:\download folder backup"
)

foreach ($path in $folders) {
    if (Test-Path $path) {
        $items = Get-ChildItem $path -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.LinkType -eq "Junction" -or $_.LinkType -eq "SymbolicLink" }
        if ($items) {
            Write-Host "=== Junctions/Symlinks in $path ==="
            $items | Select-Object FullName, LinkType, Target | Format-Table -AutoSize | Out-Host
        }
    }
}