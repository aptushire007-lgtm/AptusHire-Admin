import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CompanyDataContext } from "./companyDataContextObject.js";
import api from "../api/client.js";
import { getSocket } from "../lib/socket.js";


export function CompanyDataProvider({ children, includeCandidates = true }) {
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [candidatesByJob, setCandidatesByJob] = useState({});
  const [queue, setQueue] = useState([]);
  const [subscription, setSubscription] = useState(null);
  // How many screening decisions are waiting — the sidebar's "Review queue"
  // badge. `null` until known and on failure: a missing badge, never a 0.
  const [reviewCount, setReviewCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedScope, setLoadedScope] = useState(null);
  // Every downstream page (Dashboard, Hiring Pipeline, AI Interviews, Subscription) reads its
  // data from this one shared fetch. A failure used to be an unhandled promise rejection with
  // `me`/`jobs`/`queue`/`candidatesByJob` frozen at their empty initial values — every consumer
  // then rendered its own legitimate "nothing here yet" empty state, indistinguishable from a
  // brand-new tenant. Exposed on the context so any consumer can show a real error instead.
  const [loadError, setLoadError] = useState("");
  const requestVersion = useRef(0);
  const mounted = useRef(false);

  const fetchAll = useCallback(async (version) => {
    const isCurrent = () => mounted.current && version === requestVersion.current;
    if (!isCurrent()) return;
    setLoading(true);
    try {
      // Phase 12.5: ONE paginated company-wide request replaces the old
      // one-request-per-job fan-out (a 40-job tenant fired 40 requests here).
      const [meRes, jobsRes, queueRes, candidatesRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/jobs"),
        api.get("/interview-queue"),
        includeCandidates ? api.get("/candidates", { params: { limit: 500 } }) : Promise.resolve({ data: { items: [], pages: 0 } }),
      ]);
      if (!isCurrent()) return;

      // Keep report drill-downs complete beyond the first API page.
      const candidateItems = [...(candidatesRes.data.items || [])];
      for (let page = 2; page <= (candidatesRes.data.pages || 1); page += 1) {
        const next = await api.get("/candidates", { params: { limit: 500, page } });
        if (!isCurrent()) return;
        candidateItems.push(...(next.data.items || []));
      }
      const grouped = {};
      for (const job of jobsRes.data) grouped[job._id] = [];
      for (const c of candidateItems) {
        const jobId = c.job?._id || c.job;
        if (!grouped[jobId]) grouped[jobId] = [];
        grouped[jobId].push(c);
      }
      let nextSubscription = null;
      try {
        const subRes = await api.get("/subscriptions/me");
        nextSubscription = subRes.data;
      } catch {
        // Subscription availability must not block core recruiting data.
      }
      // Same rule for the review badge: a sidebar count must never be the
      // reason the recruiter's jobs and candidates fail to load.
      let nextReviewCount = null;
      try {
        const reviewRes = await api.get("/review-queue");
        nextReviewCount = Array.isArray(reviewRes.data) ? reviewRes.data.length : null;
      } catch {
        // Leave it unknown; the badge is simply not drawn.
      }
      if (!isCurrent()) return;
      setMe(meRes.data);
      setJobs(jobsRes.data);
      setQueue(queueRes.data);
      setCandidatesByJob(grouped);
      setSubscription(nextSubscription);
      setReviewCount(nextReviewCount);
      setLoadedScope(includeCandidates);
      setLoadError("");
    } catch (err) {
      if (isCurrent()) {
        setLoadedScope(includeCandidates);
        setLoadError(err.response?.data?.error || "Could not load your workspace data. Try refreshing again.");
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [includeCandidates]);

  // A stage move calls refresh() directly AND the backend echoes `candidate:stage`
  // on the socket, which the effect below also turns into a reload — so a single
  // move used to run the whole workspace fan-out (5 requests) twice. A short
  // trailing debounce coalesces that burst (and any other rapid-fire refresh)
  // into one fetch; every caller still gets a promise that resolves when it lands.
  const loadTimer = useRef(null);
  const waiters = useRef([]);
  const load = useCallback(
    () =>
      new Promise((resolve) => {
        if (!mounted.current) { resolve(); return; }
        const version = ++requestVersion.current;
        waiters.current.push(resolve);
        if (loadTimer.current) clearTimeout(loadTimer.current);
        loadTimer.current = setTimeout(() => {
          loadTimer.current = null;
          const pending = waiters.current;
          waiters.current = [];
          fetchAll(version).finally(() => pending.forEach((r) => r()));
        }, 300);
      }),
    [fetchAll]
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      if (loadTimer.current) clearTimeout(loadTimer.current);
      loadTimer.current = null;
      waiters.current.splice(0).forEach((resolve) => resolve());
    };
  }, [load]);

  // Live-sync: any candidate stage change (from the profile page, the Hiring
  // Pipeline board, or a review-queue resolution) broadcasts "candidate:stage".
  // Refetching here keeps `queue` (AI Interviews) and `allCandidates` (Hiring
  // Pipeline) current for every consumer without each page wiring its own
  // listener.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onStage = () => load();
    socket.on("candidate:stage", onStage);
    socket.on("job:capacity", onStage);
    return () => {
      socket.off("candidate:stage", onStage);
      socket.off("job:capacity", onStage);
    };
  }, [load]);

  const allCandidates = useMemo(() => {
    return Object.entries(candidatesByJob).flatMap(([jobId, list]) => {
      const job = jobs.find((j) => j._id === jobId);
      return list.map((c) => ({ ...c, job: c.job || job }));
    });
  }, [candidatesByJob, jobs]);

  const value = useMemo(
    () => ({ me, jobs, candidatesByJob, allCandidates, queue, subscription, reviewCount, loading: loading || loadedScope !== includeCandidates, loadError, refresh: load }),
    [me, jobs, candidatesByJob, allCandidates, queue, subscription, reviewCount, loading, loadedScope, includeCandidates, loadError, load]
  );

  return <CompanyDataContext.Provider value={value}>{children}</CompanyDataContext.Provider>;
}

export function useCompanyData() {
  const ctx = useContext(CompanyDataContext);
  if (!ctx) throw new Error("useCompanyData must be used within CompanyDataProvider");
  return ctx;
}
