import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { targetFor } from "../../lib/notificationTarget.js";

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { unreadCount, recent, markRead, markAllRead } = useNotifications() || {};

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#DCEAF5] bg-white text-[#55708F] transition-colors duration-150 hover:border-[#BFDDF5] hover:bg-[#F4FAFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(47,156,244,0.30)]"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-soft"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Notifications</p>
                <button
                  onClick={() => markAllRead?.()}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {(!recent || recent.length === 0) && (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
                )}
                {recent?.map((n) => {
                  // §1.3 — the data (candidateId/jobId in meta) was already there; nothing read it.
                  const target = targetFor(n);
                  return (
                    <button
                      key={n._id}
                      onClick={() => {
                        if (!n.read) markRead?.(n._id);
                        if (target) {
                          setOpen(false);
                          navigate(target.to);
                        }
                      }}
                      className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        n.read ? "" : "bg-brand-50/50"
                      } ${target ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{timeAgo(n.createdAt)}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="block w-full rounded-b-xl bg-slate-50 px-4 py-2.5 text-center text-xs font-semibold text-brand-700 hover:bg-slate-100"
              >
                View all notifications
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
