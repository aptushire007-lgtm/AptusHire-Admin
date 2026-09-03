import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/client.js";
import { useAdminAuth } from "../auth/useAdminAuth.js";
import { connectSocket, disconnectSocket } from "../lib/socket.js";
import { useToast } from "../components/ui/Toast.jsx";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { token, isAuthenticated } = useAdminAuth();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/admin-notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch {
      // ignore — bell just won't update this tick
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    try {
      const res = await api.get("/admin-notifications", { params: { limit: 8 } });
      setRecent(res.data.notifications);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshUnreadCount();
    refreshRecent();
  }, [isAuthenticated, refreshUnreadCount, refreshRecent]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);
    function handleNew(notification) {
      setUnreadCount((c) => c + 1);
      setRecent((list) => [notification, ...list].slice(0, 8));
      toast.info(notification.title);
    }
    socket.on("notification:new", handleNew);

    return () => {
      socket.off("notification:new", handleNew);
    };
  }, [isAuthenticated, token, toast]);

  const markRead = useCallback(async (id) => {
    await api.patch(`/admin-notifications/${id}/read`);
    setRecent((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.patch("/admin-notifications/read-all");
    setRecent((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ unreadCount, recent, markRead, markAllRead, refreshRecent, refreshUnreadCount }),
    [unreadCount, recent, markRead, markAllRead, refreshRecent, refreshUnreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
