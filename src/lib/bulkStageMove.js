// Run a fixed selection once. Keep failed/skipped IDs so a recruiter can
// inspect them; never report a partial batch as an unqualified success.
export async function bulkStageMove(candidates, targetFor, move, allowedFor) {
  const result = { succeeded: [], failed: [], skipped: [] };
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate._id)) continue;
    seen.add(candidate._id);
    const target = targetFor(candidate);
    if (!target || !allowedFor(candidate.status).includes(target)) {
      result.skipped.push(candidate._id);
      continue;
    }
    try { await move(candidate._id, target); result.succeeded.push(candidate._id); }
    catch { result.failed.push(candidate._id); }
  }
  return result;
}
