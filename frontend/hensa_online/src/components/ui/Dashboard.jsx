import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import Users from "../dashbord/Users";
import AnneeAcademique from "../dashbord/AnneeAcademique";
import Announcement from "../dashbord/Announcement";
import Filieres from "../dashbord/Filieres";
import PublicationsFeed from "../dashbord/PublicationsFeed";
import Messaging from "../dashbord/Messaging";
import Notification from "../dashbord/Notification";
import Matiere from "../dashbord/Matieres";
import Profil from "../dashbord/Profil";
import UserProfil from "../dashbord/UserProfil"; // ✅ Profil public
import EmploiDuTemps from "../dashbord/EmploiDuTemps";
import Notes from "../dashbord/Notes";

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

function renderPage(role, activePage, onNavigateToProfile) {
  // ✅ PublicationsFeed reçoit le callback pour naviguer vers un profil
  const feed = <PublicationsFeed onNavigateToProfile={onNavigateToProfile} />;

  if (role === "ETUDIANT") {
    switch (activePage) {
      case "dashboard":        return <Placeholder label="Dashboard Étudiant" />;
      case "profil":           return <Profil />;
      case "publications":     return feed;
      case "emploi-du-temps":  return <EmploiDuTemps />;
      case "notes":            return <Notes />;
      case "cours":            return <Placeholder label="Mes cours" />;
      case "messagerie":       return <Messaging />;
      case "notifications":    return <Notification />;
      case "annonces":         return <Announcement />;
      case "matieres":         return <Matiere />;
      default:                 return <Placeholder label="Dashboard Étudiant" />;
    }
  }

  if (role === "ENSEIGNANT") {
    switch (activePage) {
      case "dashboard":        return <Placeholder label="Dashboard Enseignant" />;
      case "profil":           return <Profil />;
      case "cours":            return <Placeholder label="Mes cours" />;
      case "notes":            return <Notes />;
      case "emploi-du-temps":  return <EmploiDuTemps />;
      case "messagerie":       return <Messaging />;
      case "notifications":    return <Notification />;
      case "annonces":         return <Announcement />;
      default:                 return <Placeholder label="Dashboard Enseignant" />;
    }
  }

  if (role === "ADMIN") {
    switch (activePage) {
      case "dashboard":        return <Placeholder label="Dashboard Admin" />;
      case "profil":           return <Profil />;
      case "publications":     return feed;
      case "utilisateurs":     return <Users />;
      case "filieres":         return <Filieres />;
      case "cours":            return <Placeholder label="Cours" />;
      case "emploi-du-temps":  return <EmploiDuTemps />;
      case "statistiques":     return <Placeholder label="Statistiques" />;
      case "documents":        return <Placeholder label="Documents" />;
      case "annonces":         return <Announcement />;
      case "messagerie":       return <Messaging />;
      case "notifications":    return <Notification />;
      case "annee-academique": return <AnneeAcademique />;
      case "matieres":         return <Matiere />;
      default:                 return <Placeholder label="Dashboard Admin" />;
    }
  }

  return <Placeholder label="Page introuvable" />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activePage, setActivePage]         = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ Navigation vers un profil public (depuis publications, commentaires...)
  const [viewingUserId, setViewingUserId]   = useState(null);

  if (!user) return null;

  const navigate = (page) => {
    setViewingUserId(null); // fermer tout profil ouvert
    setActivePage(page);
    setMobileMenuOpen(false);
  };

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
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"} min-w-0`}>
        <DashboardHeader
          title={
            viewingUserId
              ? "Profil utilisateur"
              : (pageLabels[activePage] || "Tableau de bord")
          }
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">

            {/* ✅ Afficher le profil public si un userId est sélectionné */}
            {viewingUserId ? (
              <UserProfil
                userId={viewingUserId}
                onBack={() => setViewingUserId(null)}
              />
            ) : (
              renderPage(user.role, activePage, (userId) => {
                // Ne pas naviguer vers son propre profil via UserProfil
                // mais vers la page Profil normale
                if (Number(userId) === Number(user.id)) {
                  setActivePage("profil");
                } else {
                  setViewingUserId(userId);
                }
              })
            )}

          </div>
        </main>
      </div>
    </div>
  );
}