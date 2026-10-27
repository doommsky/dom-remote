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
        $item = Get-Item $path
        if ($item.LinkType -eq "Junction" -or $item.LinkType -eq "SymbolicLink") {
            Write-Host "$path is a $($item.LinkType) -> $($item.Target)"
        }
    }
}
Write-Host "Done checking top-level."