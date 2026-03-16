// src/context/NotificationContext.jsx
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "../hooks/useSocket";
import { useNotificationSound } from "../hooks/useNotificationSound";
import axios from "axios";

const API = "http://localhost:5000/api";
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const socket = useSocket();
  const { play } = useNotificationSound();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  const unreadCount = notifications.filter((n) => !n.lu).length;

  // ─── Chargement initial ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Erreur notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ─── Socket temps réel ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNew = (notif) => {
      console.log("🔔 new_notification reçu :", notif);
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notif.id);
        if (exists) return prev;
        return [{ ...notif, lu: false }, ...prev];
      });
      play(notif.type || "default");
    };

    socket.on("new_notification", handleNew);

    if (user?.id) {
      socket.emit("join_user", { userId: user.id });
    }

    return () => {
      socket.off("new_notification", handleNew);
    };
  }, [socket, play, user?.id]);

  // ─── Actions partagées ───────────────────────────────────────────────────
  const markAsRead = useCallback(async (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, lu: true } : n))
    );
    try {
      await apiClient.patch(`/notifications/${notif.id}/lu`);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    try {
      await apiClient.patch("/notifications/lire-tout");
    } catch (err) {
      console.error(err);
    }
  }, []);

  const deleteNotif = useCallback(async (notif) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    try {
      await apiClient.delete(`/notifications/${notif.id}`);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      await apiClient.delete("/notifications");
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllRead,
        deleteNotif,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans <NotificationProvider>");
  return ctx;
}