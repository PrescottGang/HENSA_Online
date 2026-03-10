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

const Placeholder = ({ label }) => (
  <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-lg font-medium bg-white">
    {label}
  </div>
);

const pageLabels = {
  dashboard: "Tableau de bord",
  "emploi-du-temps": "Emploi du temps",
  notes: "Notes & Résultats",
  cours: "Mes cours",
  messagerie: "Messagerie",
  notifications: "Notifications",
  utilisateurs: "Gestion des utilisateurs",
  filieres: "Filières & Départements",
  statistiques: "Statistiques",
  documents: "Documents",
  annonces: "Annonces officielles",
  publications: "Publications",
  "annee-academique": "Année académique",
};

function renderPage(role, activePage) {
  if (role === "ETUDIANT") {
    switch (activePage) {
      case "dashboard":       return <Placeholder label="Dashboard Étudiant" />;
      case "publications":    return <PublicationsFeed />;
      case "emploi-du-temps": return <Placeholder label="Emploi du temps" />;
      case "notes":           return <Placeholder label="Notes & Résultats" />;
      case "cours":           return <Placeholder label="Mes cours" />;
      case "messagerie":      return <Messaging />;
      case "notifications":   return <Placeholder label="Notifications" />;
      case "annonces":        return <Announcement />;
      default:                return <Placeholder label="Dashboard Étudiant" />;
    }
  }

  if (role === "ENSEIGNANT") {
    switch (activePage) {
      case "dashboard":       return <Placeholder label="Dashboard Enseignant" />;
      case "cours":           return <Placeholder label="Mes cours" />;
      case "notes":           return <Placeholder label="Notes & Évaluations" />;
      case "emploi-du-temps": return <Placeholder label="Emploi du temps" />;
      case "messagerie":      return <Messaging />;
      case "notifications":   return <Placeholder label="Notifications" />;
      case "annonces":        return <Announcement />;
      default:                return <Placeholder label="Dashboard Enseignant" />;
    }
  }

  if (role === "ADMIN") {
    switch (activePage) {
      case "dashboard":       return <Placeholder label="Dashboard Admin" />;
      case "publications":    return <PublicationsFeed />;
      case "utilisateurs":    return <Users/>;
      case "filieres":        return <Filieres/>;
      case "cours":           return <Placeholder label="Cours" />;
      case "statistiques":    return <Placeholder label="Statistiques" />;
      case "documents":       return <Placeholder label="Documents" />;
      case "annonces":        return <Announcement />;
      case "messagerie":      return <Messaging />;
      case "notifications":   return <Placeholder label="Notifications" />;
      case "annee-academique":   return <AnneeAcademique />;
      default:                return <Placeholder label="Dashboard Admin" />;
    }
  }
  return <Placeholder label="Page introuvable" />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      {/* Sidebar - État contrôlé par le parent */}
      <DashboardSidebar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          setMobileMenuOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
      />

      {/* Contenu principal - Marge dynamique selon l'état de la sidebar */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        } min-w-0`}
      >
        <DashboardHeader
          title={pageLabels[activePage] || "Tableau de bord"}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderPage(user.role, activePage)}
          </div>
        </main>
      </div>
    </div>
  );
}



