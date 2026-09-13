import { useCallback, useEffect, useState } from "react";
import api from "../api/client.js";
import { getSocket } from "./socket.js";

export function usePipelineData({ job, q, phase, sort, page }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([job, q, phase, sort, page]);
  const [loadedKey, setLoadedKey] = useState(null);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api.get("/candidates/pipeline", { params: { job, q, phase, sort, page } })
        .then(response => { if (alive) { setData(response.data); setError(""); } })
        .catch(err => { if (alive) setError(err.response?.data?.error || "Could not load pipeline data. Try again."); })
        .finally(() => { if (alive) { setLoading(false); setLoadedKey(key); } });
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [job, q, phase, sort, page, attempt, key]);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on("candidate:stage", refresh);
    socket.on("candidate:review", refresh);
    socket.on("job:capacity", refresh);
    return () => { socket.off("candidate:stage", refresh); socket.off("candidate:review", refresh); socket.off("job:capacity", refresh); };
  }, [refresh]);
  return { data, loading: loading || loadedKey !== key, error, refresh };
}
