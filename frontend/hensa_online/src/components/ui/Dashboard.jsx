// src/components/ui/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import DashboardSidebar    from "../ui/DashboardSidebar";
import DashboardHeader     from "../ui/DashboardHeader";

// Pages communes
import PublicationsFeed    from "../dashbord/PublicationsFeed";
import Messaging           from "../dashbord/Messaging";
import Notification        from "../dashbord/Notification";
import Announcement        from "../dashbord/Announcement";
import Profil              from "../dashbord/Profil";
import UserProfil          from "../dashbord/UserProfil";
import EmploiDuTemps       from "../dashbord/EmploiDuTemps";
import Notes               from "../dashbord/Notes";

// Pages Admin
import Users               from "../dashbord/Users";
import AnneeAcademique     from "../dashbord/AnneeAcademique";
import Filieres            from "../dashbord/Filieres";
import Matiere             from "../dashbord/Matieres";

// Tableaux de bord par rôle
import DashboardEtudiant   from "../dashbord/DashboardEtudiant";
import DashboardEnseignant from "../dashbord/DashboardEnseignant";
import DashboardAdmin      from "../dashbord/DashboardAdmin";

// ─── Clé sessionStorage ───────────────────────────────────────────────────────
// On utilise sessionStorage (pas localStorage) pour que la page active
// soit réinitialisée à chaque nouvelle session de navigateur, mais 
// persiste lors d'un simple F5.
const PAGE_KEY = "hensa_active_page";

const Placeholder = ({ label }) => (
  <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-lg font-medium bg-white">
    {label}
  </div>
);

const pageLabels = {
  dashboard:          "Tableau de bord",
  "emploi-du-temps":  "Emploi du temps",
  notes:              "Notes & Résultats",
  cours:              "Mes cours",
  messagerie:         "Messagerie",
  notifications:      "Notifications",
  utilisateurs:       "Gestion des utilisateurs",
  filieres:           "Filières & Départements",
  statistiques:       "Statistiques",
  matieres:           "Matières",
  documents:          "Documents",
  annonces:           "Annonces officielles",
  publications:       "Publications",
  "annee-academique": "Année académique",
  profil:             "Mon profil",
};

// Pages valides par rôle — pour valider la page restaurée depuis sessionStorage
const validPagesByRole = {
  ETUDIANT:   ["dashboard","publications","emploi-du-temps","notes","cours","messagerie","notifications","annonces","matieres","profil"],
  ENSEIGNANT: ["dashboard","cours","notes","emploi-du-temps","messagerie","notifications","annonces","profil"],
  ADMIN:      ["dashboard","publications","messagerie","emploi-du-temps","notes","utilisateurs","filieres","annonces","notifications","matieres","annee-academique","cours","profil"],
};

function renderPage(role, activePage, onNavigateToProfile, onNavigate) {
  const feed = <PublicationsFeed onNavigateToProfile={onNavigateToProfile}/>;

  if (role === "ETUDIANT") {
    switch (activePage) {
      case "dashboard":       return <DashboardEtudiant   onNavigate={onNavigate}/>;
      case "profil":          return <Profil/>;
      case "publications":    return feed;
      case "emploi-du-temps": return <EmploiDuTemps/>;
      case "notes":           return <Notes/>;
      case "cours":           return <Placeholder label="Mes cours — à venir"/>;
      case "messagerie":      return <Messaging/>;
      case "notifications":   return <Notification/>;
      case "annonces":        return <Announcement/>;
      case "matieres":        return <Matiere/>;
      default:                return <DashboardEtudiant   onNavigate={onNavigate}/>;
    }
  }

  if (role === "ENSEIGNANT") {
    switch (activePage) {
      case "dashboard":       return <DashboardEnseignant onNavigate={onNavigate}/>;
      case "profil":          return <Profil/>;
      case "cours":           return <Placeholder label="Mes cours — à venir"/>;
      case "notes":           return <Notes/>;
      case "emploi-du-temps": return <EmploiDuTemps/>;
      case "messagerie":      return <Messaging/>;
      case "notifications":   return <Notification/>;
      case "annonces":        return <Announcement/>;
      default:                return <DashboardEnseignant onNavigate={onNavigate}/>;
    }
  }

  if (role === "ADMIN") {
    switch (activePage) {
      case "dashboard":        return <DashboardAdmin      onNavigate={onNavigate}/>;
      case "profil":           return <Profil/>;
      case "publications":     return feed;
      case "utilisateurs":     return <Users/>;
      case "filieres":         return <Filieres/>;
      case "cours":            return <Placeholder label="Cours — à venir"/>;
      case "emploi-du-temps":  return <EmploiDuTemps/>;
      case "notes":            return <Notes/>;
      case "statistiques":     return <Placeholder label="Statistiques — à venir"/>;
      case "documents":        return <Placeholder label="Documents — à venir"/>;
      case "annonces":         return <Announcement/>;
      case "messagerie":       return <Messaging/>;
      case "notifications":    return <Notification/>;
      case "annee-academique": return <AnneeAcademique/>;
      case "matieres":         return <Matiere/>;
      default:                 return <DashboardAdmin      onNavigate={onNavigate}/>;
    }
  }

  return <Placeholder label="Page introuvable"/>;
}

export default function Dashboard() {
  const { user } = useAuth();

  // ── Restaurer la page active depuis sessionStorage ─────────────────────────
  // Si la page sauvegardée est valide pour ce rôle → la restaurer
  // Sinon → "dashboard"
  const [activePage, setActivePage] = useState(() => {
    // Lire directement depuis sessionStorage + localStorage au montage initial
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const saved      = sessionStorage.getItem(PAGE_KEY);
      const valid      = validPagesByRole[storedUser?.role] || [];
      return saved && valid.includes(saved) ? saved : "dashboard";
    } catch { return "dashboard"; }
  });

  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [mobileMenuOpen,    setMobileMenuOpen]    = useState(false);
  const [viewingUserId,     setViewingUserId]     = useState(null);

  // ── Persister la page active dans sessionStorage à chaque changement ───────
  const navigate = (page) => {
    setViewingUserId(null);
    setActivePage(page);
    sessionStorage.setItem(PAGE_KEY, page);
    setMobileMenuOpen(false);
  };

  // Effacer la page sauvegardée quand on navigue vers "dashboard" explicitement
  // (comportement : F5 → garde la page, clic "dashboard" → force le dashboard)
  useEffect(() => {
    sessionStorage.setItem(PAGE_KEY, activePage);
  }, [activePage]);

  // Sécurité : si pas d'utilisateur (ne devrait pas arriver grâce à ProtectedRoute)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <DashboardSidebar
        activePage={activePage}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        mobileOpen={mobileMenuOpen}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"} min-w-0`}>
        <DashboardHeader
          title={viewingUserId ? "Profil utilisateur" : (pageLabels[activePage] || "Tableau de bord")}
          onMenuToggle={() => setMobileMenuOpen(v => !v)}
        />

        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {viewingUserId ? (
              <UserProfil userId={viewingUserId} onBack={() => setViewingUserId(null)}/>
            ) : (
              renderPage(
                user.role,
                activePage,
                (userId) => {
                  if (Number(userId) === Number(user.id)) {
                    navigate("profil");
                  } else {
                    setViewingUserId(userId);
                  }
                },
                navigate
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}