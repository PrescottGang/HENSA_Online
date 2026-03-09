import React from "react";
import { useState } from "react";
import ConfirmModal from "../ui/ConfirmModal";
import { useAuth } from "../../lib/auth-context";
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronLeft,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Newspaper,
  Users,
  Building,
  Megaphone,
  ClipboardList,
} from "lucide-react";

const navByRole = {
  ETUDIANT: [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "publications", label: "Publications", icon: Newspaper },
    { id: "emploi-du-temps", label: "Emploi du temps", icon: Calendar },
    { id: "notes", label: "Notes & Résultats", icon: ClipboardList },
    { id: "cours", label: "Mes cours", icon: BookOpen },
    { id: "messagerie", label: "Messagerie", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
  ],
  ENSEIGNANT: [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "cours", label: "Mes cours", icon: BookOpen },
    { id: "notes", label: "Notes & Évaluations", icon: ClipboardList },
    { id: "emploi-du-temps", label: "Emploi du temps", icon: Calendar },
    { id: "messagerie", label: "Messagerie", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
  ],
  ADMIN: [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "publications", label: "Publications", icon: Newspaper },
    { id: "messagerie", label: "Messagerie", icon: Mail },
    { id: "cours", label: "Cours", icon: BookOpen },
    { id: "emploi-du-temps", label: "Emploi du temps", icon: FileText },
    { id: "utilisateurs", label: "Utilisateurs", icon: Users },
    { id: "filieres", label: "Filières", icon: Building },
    { id: "annonces", label: "Annonces", icon: Megaphone },
    { id: "annee-academique", label: "Année Académique", icon: Calendar },
  ],
};

const roleLabel = {
  ETUDIANT: "Étudiant",
  ENSEIGNANT: "Enseignant",
  ADMIN: "Administration",
};

export default function DashboardSidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
}) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navItems = navByRole[user.role] || [];
  const initials =
    `${user.prenom?.[0] ?? ""}${user.nom?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      <aside
        className={`flex flex-col h-screen bg-blue-800 text-white transition-all duration-300 fixed left-0 top-0 z-50 ${
          collapsed ? "w-16" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header Sidebar */}
        <div className="flex items-center gap-3 px-4 py-5 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!collapsed && (
            <h1 className="flex-1 font-bold text-base tracking-tight truncate">
              Hensa On Line
            </h1>
          )}
          <button
            onClick={onToggle}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded hover:bg-white/10 flex-shrink-0"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
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
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    activePage === item.id
                      ? "bg-white text-blue-800 shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 flex-shrink-0 ${activePage === item.id ? "text-blue-800" : ""}`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <hr className="border-white/15" />

        {/* User Info */}
        <div className="p-3 bg-blue-900/50">
          <div
            className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-white/10">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/50">
                  {roleLabel[user.role]}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => setShowLogoutModal(true)}
                className="h-8 w-8 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-red-500/20"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
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
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />
    </>
  );
}
