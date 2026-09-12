// Run a fixed selection of permanent deletes once. Mirrors bulkStageMove.js: the
// server only ever erases one candidate per request (DPDP right-to-erasure is a
// per-data-subject action, and the endpoint is audited that way), so "bulk" is this
// loop calling it once per candidate, keeping succeeded/failed apart so a partial
// batch is never reported as an unqualified success.
export async function bulkErase(candidateIds, eraseOne) {
  const result = { succeeded: [], failed: [] };
  const seen = new Set();
  for (const id of candidateIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      await eraseOne(id);
      result.succeeded.push(id);
    } catch {
      result.failed.push(id);
    }
  }
  return result;
}
