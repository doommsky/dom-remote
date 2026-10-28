# Handoff Protocol (Standing Instruction)

At the end of EVERY task, produce:
1. Normal concise output first.
2. Then a full handoff report in this format:

## Handoff Report
1. Original task and acceptance criteria.
2. Repository branch and relevant commit info.
3. Files inspected and files changed.
4. Changes actually implemented.
5. Commands and tests actually executed, with results.
6. Build and runtime verification status.
7. Incomplete requirements, blockers, known defects.
8. Assumptions or decisions requiring review.
9. Relevant Git diff, commit, PR, or file references.
10. Recommended next steps in dependency order.

Always distinguish completed, partial, unverified, failed. Never report a test passing unless executed and result known.
EOF