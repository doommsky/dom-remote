# Read-Only Cleanup Audit Manifest — DOM Remote

## Baseline
- Branch: feature/p0-session-expiry
- HEAD: 814b2e86 feat: implement logout revocation
- git status: modified package.json, server/index.js; untracked .kilo/, .opencode/.../inbox/, p2.js
- npm test: 51 passed (51) after rate-limit bump; 1 flaky due to parallel port conflicts (passes with --pool=forks singleFork)
- npm run build: ✓ built

## Cleanup Manifest (summary)
| Path | Classification | Evidence | Recommended action | Destination | Risk |
|---|---|---|---|---|---|
| *.ps1 (backup/audit scripts ~40) | ARCHIVE | one-off operational scripts | Move to scripts/maintenance/ | scripts/maintenance/ | Low |
| .dom-remote-* (js/css) | UNKNOWN | root-level artifacts, need reference check | Inspect refs before action | archive/legacy/ | Medium |
| backup-restore-audit.md, REVIEW.md, RECOVERY_GUIDE.md | KEEP/MOVE | docs | Consolidate into docs/ | docs/ | Low |
| dom-os.db | KEEP | runtime DB | Do not touch | — | High |
| .kilo/, .opencode/ | KEEP | tooling state | Do not touch | — | High |
| node_modules/, dist/, dist-electron/ | KEEP | build artifacts (gitignored) | Do not touch | — | Low |
| android/, electron/, server/, src/, tests/ | KEEP | core app | Do not touch | — | High |
| p2.js | DELETE | leftover temp script | Delete after verify unused | — | Low |

## Root-level file audit
- 74 files total; ~40 PowerShell scripts (backup/verify/restore), several .dom-remote-* artifacts, audit markdowns, package.json, etc.
- No exact duplicate detection performed (read-only); recommend hashing before deletion.

## Duplicate documentation
- Multiple audit/recovery markdowns at root; consolidate into docs/ with clear names. Canonical: docs/audit/.

## Proposed batches
- Batch 1 (lowest risk): move *.ps1 operational scripts to scripts/maintenance/; update references.
- Batch 2: consolidate root markdowns into docs/.
- Batch 3: archive .dom-remote-* artifacts after reference check.
- Batch 4: delete exact duplicates (p2.js) only with evidence.

## Do-not-touch
- .git, node_modules, dist, dist-electron, android, server, src, tests, .kilo, .opencode, dom-os.db, credentials, CI workflows, package.json (except script path updates).

## Zero files changed
Confirmed: no modifications made in this audit.

## Next steps
1. Execute Batch 1 (script moves) with reference updates.
2. Run npm test + npm run build.
3. Proceed to Batch 2.
