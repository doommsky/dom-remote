# Git Backup Restore Audit — DOOM REMOTE

**Date:** 2026-10-27
**Scope:** `C:\Users\DOOM98\BACKUPS\GitBundles`
**Live repos:** `C:\Users\DOOM98\AI OS\03_PROJECTS\DOOM REMOTE` (parent) and its `doom-remote` submodule
**Result:** 38 checks PASS, 0 FAIL, 0 SKIP

---

## 1. What was wrong

The backup set looked complete but **none of the patch or zip artifacts could be
restored**. The bundles were fine; everything else was damaged by the way the
backup script wrote files.

### Root cause: PowerShell text pipeline

`create_git_bundles_v3.ps1` / `v4.ps1` wrote patches like this:

```powershell
$diff = git -C $SubmodulePath diff HEAD 2>&1
$patchContent | Out-File -FilePath $patchFile -Encoding UTF8
```

On this machine (Windows PowerShell 5.1, `[Console]::OutputEncoding = ibm850`)
that pipeline introduces three separate defects:

| Defect | Cause | Effect |
|---|---|---|
| UTF-8 BOM | `Out-File -Encoding UTF8` in PS 5.1 | `EF BB BF` prepended to the file |
| CRLF endings | `Out-File` rewrites line endings | every line ends `\r\n` instead of `\n` |
| **Mojibake** | native output decoded with the OEM code page 850 | `→` → `ÔåÆ`, `—` → `ÔÇö`, `ñ` → `├▒`, `é` → `├®` |

The mojibake is what actually breaks `git apply`: the patch text no longer
matches the bytes in the target files. `--ignore-whitespace` does not help,
because the bytes are genuinely different.

### Three separate format bugs

1. **Status output written as `.patch`** — `create_git_bundles*.ps1` lines
   306/333 wrote `git status --porcelain` output into a file named
   `*_uncommitted_*.patch`. Those are status reports, not diffs, and
   `git apply` rejects them with *"No valid patches in input"*.

2. **Collapsed diff** — `create_git_bundles_v2.ps1` line 203 did
   `$patchContent += $diff`, where `$diff` is an **array** of lines. PowerShell
   joins an array with spaces, so the entire diff landed on one line. This
   produced the `2026-10-26_223914` and `224254` patches.

3. **Wrong zip paths** — `Compress-Archive` roots entries at the *common parent
   directory* of the inputs. The untracked files are
   `agent/src/web/mod.rs` and `agent/src/web/wire.rs`, so the common root became
   `agent/src/` and the zip stored `web/mod.rs` / `web/wire.rs`. Extracting it
   into the submodule root puts the files in the wrong place.

### Two more latent bugs in v4

- `Write-Log "..." -ForegroundColor Cyan` — `Write-Log` has no
  `-ForegroundColor` parameter, so every one of those calls raised a parameter
  binding error.
- `exit (if ($failCount -gt 0) { 1 } else { 0 })` — `if` is not an expression in
  PS 5.1, so the script could never set a correct exit code.

---

## 2. What was repaired

`repair-backups.ps1` produced repaired copies alongside every damaged artifact
(originals left untouched):

| Artifact | Repair |
|---|---|
| `submodule_changes_2026-10-26_224501.patch` | BOM stripped, CP850 mojibake reversed, CRLF → LF |
| `submodule_changes_2026-10-26_223914.patch` | report wrapper discarded, diff regenerated from the bundle |
| `submodule_changes_2026-10-26_224254.patch` | report wrapper discarded, diff regenerated from the bundle |
| `doom-remote_uncommitted_*.patch` (6) | reclassified as status reports → `*.repaired.status.txt` |
| `submodule_untracked_*.zip` (3) | entries re-pathed to `agent/src/web/...`, hashes verified |

The repaired `submodule_changes_2026-10-26_224501.repaired.patch` is
**byte-identical** (SHA-256 `8C59507C…F8CC1B7`) to a patch regenerated directly
from the bundle by `git diff HEAD`, which proves the repair is exact rather than
approximate.

---

## 3. Verification

`verify-backups.ps1` — **38 PASS / 0 FAIL / 0 SKIP**

- **13 bundles** clone successfully; every HEAD matches the live repositories.
- **11 patches** apply cleanly to the bundle they were taken against.
- **5 zips** extract to correct repo-relative paths with matching SHA-256.
- **End-to-end restore** of the newest set:
  `clone bundle → apply patch → extract zip` reproduces the live submodule
  exactly — identical `git status` (7 entries), identical index blob hashes for
  all 93 tracked files, identical worktree presence, identical bytes for both
  untracked files.
- **Parent repo**: bundle HEAD `e7f509b4…` and submodule gitlink
  `18c17802…` both match live.

> Note on line endings: the live worktree holds LF while a fresh clone checks
> out CRLF (both repos have `core.autocrlf=true`). Git's clean filter
> normalises both, so the comparison is done on index blob hashes rather than
> raw bytes. This is a checkout artifact, not data loss.

---

## 4. Going forward

`create_git_bundles_v5.ps1` replaces v1–v4. It writes every artifact with git
or `System.IO` directly, so nothing passes through a PowerShell text pipeline:

- patches via `git diff HEAD --output=<file>` (git writes the bytes itself)
- status via `[System.IO.File]::WriteAllText` with a BOM-less UTF-8 encoder
- zips via `System.IO.Compression.ZipFile` with explicit repo-relative entry names
- one shared timestamp across all artifacts of a run
- a self-verification pass at the end: clone each bundle, `git apply --check`
  each patch, inspect each zip

Its output for `2026-10-27_033747` is byte-identical to the repaired patch and
exits 0.

### Scripts

| File | Purpose |
|---|---|
| `create_git_bundles_v5.ps1` | the backup script (use this one) |
| `verify-backups.ps1` | verifies the whole backup set restores correctly |
| `repair-backups.ps1` | repairs artifacts produced by v1–v4 |
| `repair-patches.ps1` | encoding-only repair (BOM / CP850 / CRLF) |

Run with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\create_git_bundles_v5.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\verify-backups.ps1
```

---

## 5. Current state of `BACKUPS\GitBundles`

- **Canonical set:** `2026-10-27_033747` — produced by v5, fully verified.
- **Historical sets:** `2026-10-26_*` — bundles are good; use the
  `*.repaired.patch` / `*.repaired.zip` copies, not the originals.
- The damaged originals were kept as the historical record. They can be deleted
  once you are satisfied with the repaired copies.
- 99 disposable `test_restore_*` clone directories were removed from
  `GitBundles` (all were clean clones of the submodule bundle at HEAD
  `18c17802…` with zero uncommitted changes). Test restores now go to
  `C:\Users\DOOM98\BACKUPS\TestRestore`.
