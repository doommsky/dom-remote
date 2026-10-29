$gitRepos = @(
    "D:\AI OS",
    "D:\Repos\DOOM REMOTE"
)

foreach ($repo in $gitRepos) {
    if (Test-Path (Join-Path $repo ".git")) {
        Write-Host "=== $repo ==="
        try {
            $status = git -C $repo status --porcelain 2>&1
            $branch = git -C $repo branch --show-current 2>&1
            $remote = git -C $repo remote -v 2>&1
            $log = git -C $repo log --oneline -5 2>&1
            
            Write-Host "Branch: $branch"
            Write-Host "Remote: $remote"
            Write-Host "Recent commits:"
            Write-Host $log
            Write-Host "Status (porcelain):"
            if ($status) { Write-Host $status } else { Write-Host "(clean)" }
        } catch {
            Write-Host "Error: $_"
        }
        Write-Host ""
    }
}