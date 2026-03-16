// src/components/DashboardSidebar.jsx
import React, { useState, useEffect } from "react";
import ConfirmModal from "../ui/ConfirmModal";
import { useAuth } from "../../lib/auth-context";
import { useSocket } from "../hooks/useSocket";
import {
  Bell, BookOpen, Calendar, ChevronLeft, FileText,
  GraduationCap, LayoutDashboard, LogOut, Mail,
  Newspaper, Users, Building, Megaphone, ClipboardList,
} from "lucide-react";

const BASE_URL = "http://localhost:5000";
const fullUrl  = (url) => !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;

const navByRole = {
  ETUDIANT: [
    { id: "dashboard",       label: "Tableau de bord",   icon: LayoutDashboard },
    { id: "publications",    label: "Publications",       icon: Newspaper       },
    { id: "emploi-du-temps", label: "Emploi du temps",   icon: Calendar        },
    { id: "notes",           label: "Notes & Résultats",  icon: ClipboardList   },
    { id: "cours",           label: "Mes cours",          icon: BookOpen        },
    { id: "messagerie",      label: "Messagerie",         icon: Mail            },
    { id: "notifications",   label: "Notifications",      icon: Bell            },
    { id: "annonces",        label: "Annonces",           icon: Megaphone       },
    { id: "matieres",        label: "Matières",           icon: BookOpen        },
  ],
  ENSEIGNANT: [
    { id: "dashboard",       label: "Tableau de bord",     icon: LayoutDashboard },
    { id: "cours",           label: "Mes cours",            icon: BookOpen        },
    { id: "notes",           label: "Notes & Évaluations",  icon: ClipboardList   },
    { id: "emploi-du-temps", label: "Emploi du temps",      icon: Calendar        },
    { id: "messagerie",      label: "Messagerie",           icon: Mail            },
    { id: "notifications",   label: "Notifications",        icon: Bell            },
    { id: "annonces",        label: "Annonces",             icon: Megaphone       },
  ],
  ADMIN: [
    { id: "dashboard",        label: "Tableau de bord",   icon: LayoutDashboard },
    { id: "publications",     label: "Publications",       icon: Newspaper       },
    { id: "messagerie",       label: "Messagerie",         icon: Mail            },
    { id: "cours",            label: "Cours",              icon: BookOpen        },
    { id: "emploi-du-temps",  label: "Emploi du temps",   icon: FileText        },
    { id: "utilisateurs",     label: "Utilisateurs",       icon: Users           },
    { id: "filieres",         label: "Filières",           icon: Building        },
    { id: "annonces",         label: "Annonces",           icon: Megaphone       },
    { id: "notifications",    label: "Notifications",      icon: Bell            },
    { id: "matieres",         label: "Matières",           icon: BookOpen        },
    { id: "annee-academique", label: "Année Académique",   icon: Calendar        },
  ],
};

const roleLabel = {
  ETUDIANT:   "Étudiant",
  ENSEIGNANT: "Enseignant",
  ADMIN:      "Administration",
};

// ─── Avatar sidebar (photo ou initiales) ─────────────────────────────────────
function SidebarAvatar({ user }) {
  const [imgError, setImgError] = useState(false);
  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase();
  const photoUrl = fullUrl(user?.photo_profil);

  // Reset imgError quand la photo change
  useEffect(() => { setImgError(false); }, [user?.photo_profil]);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={`${user?.prenom} ${user?.nom}`}
        className="h-9 w-9 rounded-full object-cover flex-shrink-0 border-2 border-white/20"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-white/10 text-white">
      {initials}
    </div>
  );
}

export default function DashboardSidebar({
  activePage, onNavigate, collapsed, onToggle, mobileOpen,
}) {
  const { user, logout, updateUser } = useAuth();
  const socket = useSocket();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user) return null;
  const navItems = navByRole[user.role] || [];

  // ✅ Écouter userUpdated pour mettre à jour la photo/nom dans la sidebar en temps réel
  useEffect(() => {
    if (!socket) return;
    const onUserUpdated = ({ id, nom, prenom, photo_profil }) => {
      if (Number(id) !== Number(user.id)) return;
      // Mettre à jour le contexte auth → la sidebar re-render automatiquement
      updateUser?.({
        ...user,
        ...(nom          && { nom }),
        ...(prenom       && { prenom }),
        ...(photo_profil && { photo_profil }),
      });
      // Mettre à jour le localStorage
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({
        ...stored,
        ...(nom          && { nom }),
        ...(prenom       && { prenom }),
        ...(photo_profil && { photo_profil }),
      }));
    };
    socket.on("userUpdated", onUserUpdated);
    return () => socket.off("userUpdated", onUserUpdated);
  }, [socket, user, updateUser]);

  return (
    <>
      <aside
        className={`flex flex-col h-screen bg-blue-800 text-white transition-all duration-300 fixed left-0 top-0 z-50
          ${collapsed ? "w-16" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-5 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!collapsed && (
            <h1 className="flex-1 font-bold text-base tracking-tight truncate">Hensa On Line</h1>
          )}
          <button
            onClick={onToggle}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 flex-shrink-0"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <hr className="border-white/15" />

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto custom-scrollbar">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                    ${activePage === item.id
                      ? "bg-white text-blue-800 shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                >
                  <item.icon className={`h-4 w-4 flex-shrink-0 ${activePage === item.id ? "text-blue-800" : ""}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <hr className="border-white/15" />

        {/* User info + profil */}
        <div className="p-3 bg-blue-900/50">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>

            {/* Zone cliquable → page profil */}
            <button
              onClick={() => onNavigate("profil")}
              title="Voir mon profil"
              className={`flex items-center gap-3 flex-1 min-w-0 rounded-xl px-2 py-1.5 hover:bg-white/10 transition group ${collapsed ? "justify-center" : ""}`}
            >
              <div className="relative flex-shrink-0">
                {/* ✅ Avatar avec photo mise à jour en temps réel */}
                <SidebarAvatar user={user} />
                {/* Point "en ligne" */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-blue-900" />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate group-hover:text-white transition">
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">
                    {roleLabel[user.role]}
                  </p>
                </div>
              )}
            </button>

            {/* Déconnexion */}
            {!collapsed && (
              <button
                onClick={() => setShowLogoutModal(true)}
                className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-red-500/25 transition"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="mt-2 w-full flex items-center justify-center h-8 rounded-lg text-white/60 hover:text-white hover:bg-red-500/25 transition"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      <ConfirmModal
        open={showLogoutModal}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Oui, me déconnecter"
        cancelText="Annuler"
        variant="danger"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); logout(); }}
      />
    </>
  );
}