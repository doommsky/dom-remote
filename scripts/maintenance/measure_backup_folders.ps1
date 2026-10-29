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

$results = @()
foreach ($path in $folders) {
    if (Test-Path $path) {
        $files = Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue
        $size = ($files | Measure-Object -Property Length -Sum).Sum
        $results += [PSCustomObject]@{
            Path = $path
            Files = $files.Count
            SizeGB = [math]::Round($size/1GB, 2)
            SizeMB = [math]::Round($size/1MB, 2)
        }
    } else {
        $results += [PSCustomObject]@{
            Path = $path
            Files = 0
            SizeGB = 0
            SizeMB = 0
            Note = "NOT FOUND"
        }
    }
}
$results | Sort-Object SizeGB -Descending | Format-Table -AutoSize