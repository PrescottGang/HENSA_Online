// src/pages/Notifications.jsx
import { Bell, Loader, CheckCheck, Trash2, Megaphone, Heart, MessageCircle, FileText, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../ui/NotificationContext";

const TYPE_CONFIG = {
  announcement: { icon: Megaphone, color: "text-blue-600",   bg: "bg-blue-100"   },
  like:         { icon: Heart,     color: "text-red-500",    bg: "bg-red-100"    },
  comment:      { icon: MessageCircle, color: "text-green-600", bg: "bg-green-100" },
  publication:  { icon: FileText,  color: "text-purple-600", bg: "bg-purple-100" },
  message:      { icon: Send,      color: "text-blue-500",   bg: "bg-blue-100"   },
};
const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.announcement;

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllRead, deleteNotif, clearAll } = useNotifications();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </h1>
        <div className="flex gap-3">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Tout supprimer
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader className="animate-spin h-6 w-6" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Aucune notification</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg  = getConfig(n.type);
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition
                  ${!n.lu ? "bg-blue-50" : "bg-white hover:bg-gray-50"}`}
                onClick={() => {
                  markAsRead(n);
                  if (n.lien) navigate(n.lien);
                }}
              >
                <div className={`p-2 rounded-lg ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{n.titre}</p>
                  {n.message && <p className="text-sm text-gray-500">{n.message}</p>}
                  <span className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(n); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}