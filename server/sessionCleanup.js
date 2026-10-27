export async function expireStaleSessions(db, maxAgeMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  await db.run("UPDATE sessions SET status = 'expired', ended_at = ? WHERE status IN ('active','pending') AND started_at < ?", [Date.now(), cutoff]);
}
