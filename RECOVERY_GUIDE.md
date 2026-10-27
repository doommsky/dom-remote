# AI-OPS Backup & Recovery Guide

**Version:** 1.0  
**Last Updated:** 2026-10-26  
**Status:** Tested and Verified

---

## Overview

This guide documents the backup and recovery procedures for the AI-OPS system. All procedures have been tested and verified.

---

## Backup Structure

```
C:\Users\DOOM98\BACKUPS\
├── GitBundles\           # Weekly Git bundles (versioned)
│   ├── doom-remote_YYYY-MM-DD_HHmmss.bundle
│   └── doom-remote_uncommitted_YYYY-MM-DD_HHmmss.patch
├── FileBackups\          # Monthly file backups (versioned)
│   ├── projects_YYYY-MM-DD_HHmmss.zip
│   └── system-docs_YYYY-MM-DD_HHmmss.zip
└── Logs\                 # Audit logs
    ├── git_bundle_YYYY-MM-DD_HHmmss.log
    └── file_backup_YYYY-MM-DD_HHmmss.log
```

---

## What Gets Backed Up

### 1. Git Repositories (Weekly)
| Repository | Location | Size | Frequency |
|------------|----------|------|-----------|
| DOOM REMOTE | `C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE` | ~868 MB | Weekly |

**What's included:**
- Complete Git history (all branches, tags, remotes)
- Uncommitted changes saved as separate patch file
- Verified bundle integrity

### 2. File Backups (Monthly)
| Directory | Source | Exclusions |
|-----------|--------|------------|
| PROJECTS | `C:\Users\DOOM98\PROJECTS` | node_modules, .git, bin, obj, *.dll, *.exe, *.pdb, *.lock |
| SYSTEM-DOCS | `C:\Users\DOOM98\SYSTEM-DOCS` | *.tmp, *.temp, *.log, *.cache, *.dll, *.exe, *.pdb |
| WORK | `C:\Users\DOOM98\WORK` | *.tmp, *.temp, *.log, *.cache, node_modules, .git, bin, obj, *.dll, *.exe, *.pdb |
| PERSONAL | `C:\Users\DOOM98\PERSONAL` | *.tmp, *.temp, *.log, *.cache, *.dll, *.exe, *.pdb, *.iso, *.vhd, *.vhdx |
| INBOX | `C:\Users\DOOM98\INBOX` | *.tmp, *.temp, *.log, *.cache, *.exe, *.msi, *.dmg |
| SYSTEM-DOCS | `C:\Users\DOOM98\SYSTEM-DOCS` | *.tmp, *.temp, *.log, *.cache, *.dll, *.exe, *.pdb |

**Exclusions applied:** Temporary files, build artifacts, binaries, caches, Git metadata, secrets

---

## Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Git Bundles | Weekly | 12 weekly, 12 monthly, 5 yearly |
| File Backups | Monthly | 12 monthly, 5 yearly |
| Logs | Continuous | 90 days |

---

## Restoration Procedures

### 1. Restore Git Repository from Bundle

```powershell
# 1. Locate the bundle
$bundle = "C:\Users\DOOM98\BACKUPS\GitBundles\doom-remote_2026-10-26_221305.bundle"

# 2. Choose restore location (NEVER overwrite original)
$restorePath = "C:\Users\DOOM98\BACKUPS\TestRestore\doom-remote_restored_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"

# 3. Clone from bundle
git clone $bundle $restorePath

# 4. Verify
cd $restorePath
git status
git log --oneline -5
```

**Verification steps:**
1. Check `git status` - should be clean
2. Check `git log --oneline -5` - should show expected history
3. Check `git branch -a` - should show all branches
4. Verify file count matches original

### 2. Restore Files from Zip Archive

```powershell
# 1. Locate the zip
$zip = "C:\Users\DOOM98\BACKUPS\FileBackups\projects_2026-10-26_221440.zip"

# 2. Choose restore location (NEVER overwrite original)
$restorePath = "C:\Users\DOOM98\BACKUPS\TestRestore\projects_restored_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"

# 3. Extract
Expand-Archive -Path $zip -DestinationPath $restorePath -Force

# 3. Verify
$count = (Get-ChildItem $restorePath -Recurse -File).Count
Write-Host "Restored $count files"
```

### 3. Restore Uncommitted Changes (Git)

```powershell
# 1. Locate the patch file
$patch = "C:\Users\DOOM98\BACKUPS\GitBundles\doom-remote_uncommitted_2026-10-26_221305.patch"

# 2. Apply to restored repo
cd $restoredRepoPath
git apply $patch

# 3. Verify
git status
```

---

## Verification Procedures

### Test Git Bundle Integrity
```powershell
git bundle verify "C:\Users\DOOM98\BACKUPS\GitBundles\doom-remote_2026-10-26_221305.bundle"
git bundle list-heads "C:\Users\DOOM98\BACKUPS\GitBundles\doom-remote_2026-10-26_221305.bundle"
```

### Test Zip Archive Integrity
```powershell
$shell = New-Object -ComObject Shell.Application
$zip = $shell.NameSpace("C:\Users\DOOM98\BACKUPS\FileBackups\projects_2026-10-26_221440.zip")
$zip.Items().Count  # Should show entry count > 0
```

### Full Restoration Test (Monthly)
1. Restore Git bundle to temp directory
2. Restore file zips to temp directory
2. Verify file counts match original
3. Verify Git history matches
4. Clean up test restore

---

## Monitoring & Alerting

### Log Locations
- Git bundle logs: `C:\Users\DOOM98\BACKUPS\Logs\git_bundle_*.log`
- File backup logs: `C:\Users\DOOM98\BACKUPS\Logs\file_backup_*.log`

### Alert Conditions
| Condition | Action |
|-----------|--------|
| Git bundle creation fails | Alert immediately |
| File backup fails | Alert immediately |
| Disk space < 10 GB free | Alert |
| Backup older than 8 days (weekly) | Alert |
| Backup older than 35 days (monthly) | Alert |
| Verification fails | Alert immediately |

---

## Retention Policy

| Backup Type | Keep | Auto-Delete |
|-------------|------|-------------|
| Weekly Git bundles | 12 weeks | After 12 weeks |
| Monthly Git bundles | 12 months | After 12 months |
| Yearly Git bundles | 5 years | After 5 years |
| Monthly file backups | 12 months | After 12 months |
| Yearly file backups | 5 years | After 5 years |
| Logs | 90 days | After 90 days |

**Note:** Never auto-delete the most recent backup of each type.

---

## Emergency Recovery Checklist

- [ ] Identify what needs restoring (Git repo / files / both)
- [ ] Locate most recent valid backup
- [ ] Choose isolated restore location (NEVER overwrite original)
- [ ] Perform restoration
- [ ] Verify restoration (file counts, Git history, file contents)
- [ ] If uncommitted changes needed, apply patch
- [ ] Validate with stakeholder
- [ ] Replace original only after verification complete

---

## Contact & Escalation

- **Primary:** AI-OPS automated system
- **Escalation:** Human review required for any FAIL status
- **Logs:** All operations logged to `C:\Users\DOOM98\BACKUPS\Logs\`

---

*Generated: 2026-10-26 | AI-OPS Backup System v1.0 | Tested: 2026-10-26*