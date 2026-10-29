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
        # Check for .git folder
        $gitPath = Join-Path $path ".git"
        $isGitRepo = Test-Path $gitPath -PathType Container
        
        # Check for junctions/symlinks
        $item = Get-Item $path
        $isJunction = $item.LinkType -eq "Junction"
        $isSymlink = $item.LinkType -eq "SymbolicLink"
        
        # Check for nested backup folders (folders with "backup" in name)
        $nestedBackups = Get-ChildItem $path -Directory -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -like "*backup*" -or $_.Name -like "*BACKUP*" -or $_.Name -like "*Backup*" } |
            Select-Object -First 5 -ExpandProperty FullName
        
        $results += [PSCustomObject]@{
            Path = $path
            IsGitRepo = $isGitRepo
            IsJunction = $isJunction
            IsSymlink = $isSymlink
            LinkType = $item.LinkType
            NestedBackups = ($nestedBackups -join "; ")
        }
    }
}
$results | Format-Table -AutoSize