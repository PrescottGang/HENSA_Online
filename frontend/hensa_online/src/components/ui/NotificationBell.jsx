// src/components/NotificationBell.jsx
import { useState, useRef, useEffect } from "react";
import {
  Bell, X, Calendar, CheckCheck, Loader,
  Megaphone, Heart, MessageCircle, FileText, Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "./NotificationContext";

const TYPE_CONFIG = {
  announcement: {
    icon: Megaphone, iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400", dotColor: "bg-blue-500",
    label: "Annonce", labelBg: "bg-blue-100 text-blue-700",
  },
  like: {
    icon: Heart, iconBg: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-500", dotColor: "bg-red-500",
    label: "Like", labelBg: "bg-red-100 text-red-600",
  },
  comment: {
    icon: MessageCircle, iconBg: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600", dotColor: "bg-green-500",
    label: "Commentaire", labelBg: "bg-green-100 text-green-700",
  },
  publication: {
    icon: FileText, iconBg: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600", dotColor: "bg-purple-500",
    label: "Publication", labelBg: "bg-purple-100 text-purple-700",
  },
  message: {
    icon: Send, iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-500", dotColor: "bg-blue-500",
    label: "Message", labelBg: "bg-blue-100 text-blue-600",
  },
};
const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.announcement;

export default function NotificationBell() {
  const navigate  = useNavigate();
  const panelRef  = useRef(null);
  const [open, setOpen] = useState(false);

  const { notifications, loading, unreadCount, markAsRead, markAllRead, deleteNotif, clearAll } =
    useNotifications();

  // ─── Fermer si clic en dehors ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async (notif) => {
    await markAsRead(notif);
    setOpen(false);
    if (notif.lien) navigate(notif.lien, { state: { highlightId: notif.entite_id } });
  };

  return (
    <div className="relative" ref={panelRef}>

      {/* Cloche */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                  {unreadCount} nouveau{unreadCount > 1 ? "x" : ""}
                </span>
              )}
            </span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition"
              >
                <CheckCheck className="h-3 w-3" /> Tout lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification</p>
                <p className="text-xs text-gray-400 mt-1">Vos notifications apparaîtront ici</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg  = getConfig(n.type);
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-4 py-3 transition group cursor-pointer ${
                      !n.lu
                        ? "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100/70"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.iconBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                      </div>
                      {!n.lu && (
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${cfg.dotColor}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cfg.labelBg}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug truncate">
                        {n.titre}
                      </p>
                      {n.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {n.message}
                        </p>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {" · "}
                        {new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {n.lien && (
                        <span className="text-[10px] text-blue-500 mt-0.5 block">Voir →</span>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition mt-0.5 flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <button
                onClick={() => { navigate("/notifications"); setOpen(false); }}
                className="text-xs text-blue-600 hover:text-blue-800 transition"
              >
                Voir toutes les notifications
              </button>
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition">
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}