// src/components/dashbord/DashboardAdmin.jsx
import { useState, useEffect } from "react";
import {
  Users, BookOpen, Calendar, TrendingUp,
  GraduationCap, Clock, MapPin, Loader,
  Bell, Megaphone, Building,
  CheckCircle, BarChart2, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import axios from "axios";

// ─── Config Axios ────────────────────────────────────────────────────────────
const API = "http://localhost:5000/api";
const api = axios.create({ baseURL: API });
api.interceptors.request.use(c => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtH = t => t?.slice(0, 5) ?? "";

const TYPE_COLORS = {
  CM: "bg-blue-100 text-blue-700",
  TD: "bg-green-100 text-green-700",
  TP: "bg-purple-100 text-purple-700",
};

// Palette dynamique pour les filières
const PALETTE = ["#2563EB", "#38BDF8", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#EC4899", "#14B8A6"];

// ─── Tooltip BarChart ─────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold text-blue-600">{payload[0].value} inscrits</p>
      </div>
    );
  }
  return null;
};

// ─── Légende filières ─────────────────────────────────────────────────────────
const FilieresLegend = ({ data }) => (
  <div className="space-y-2 mt-3">
    {data.map((item, i) => (
      <div key={item.name} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
          <span className="text-sm text-blue-600 truncate max-w-[140px]">{item.name}</span>
        </div>
        <span className="text-sm font-medium text-gray-700">{item.value}</span>
      </div>
    ))}
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DashboardAdmin({ onNavigate }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [stats,         setStats]        = useState(null);
  const [seancesAuj,    setSeancesAuj]   = useState([]);
  const [notifications, setNotifs]       = useState([]);
  const [annonces,      setAnnonces]     = useState([]);
  const [recentUsers,   setRecentUsers]  = useState([]);
  const [loading,       setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, notifsRes, annoncesRes, semsRes, etudsRes, enssRes] =
          await Promise.all([
            api.get("/dashboard/stats"),        // ← route dédiée
            api.get("/notifications?limit=5"),
            api.get("/announcements?limit=4"),
            api.get("/cours/semaines"),
            api.get("/users/etudiants"),
            api.get("/users/enseignants"),
          ]);

        setStats(dashRes.data);
        setNotifs(notifsRes.data || []);
        setAnnonces(annoncesRes.data || []);

        const etuds = etudsRes.data || [];
        const enss  = enssRes.data  || [];
        setRecentUsers(
          [...etuds, ...enss]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
        );

        // Séances du jour
        const semaines = semsRes.data || [];
        const today = new Date().toISOString().slice(0, 10);
        const current =
          semaines.find(s => s.date_debut <= today && s.date_fin >= today) ||
          semaines.find(s => s.date_debut >= today) ||
          semaines[0];
        if (current) {
          const r = await api.get(`/cours/seances?semaine_id=${current.id}`);
          setSeancesAuj(
            (r.data || []).filter(s => s.date?.slice(0, 10) === today && s.statut === "PLANIFIEE")
          );
        }
      } catch (e) {
        console.error("Erreur chargement dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const notifsNonLues = notifications.filter(n => !n.lu).length;

  // Données graphiques (depuis l'API)
  const inscriptionsData = stats?.inscriptions_evolution || [];
  const filieresData = (stats?.filieres_repartition || []).map((f, i) => ({
    ...f,
    color: PALETTE[i % PALETTE.length],
  }));

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = [
    { icon: Users,        label: "Etudiants",     value: stats?.etudiants    ?? "—", iconBg: "bg-blue-50",   iconColor: "text-blue-500",   onClick: () => onNavigate("utilisateurs") },
    { icon: GraduationCap,label: "Enseignants",   value: stats?.enseignants  ?? "—", iconBg: "bg-green-50",  iconColor: "text-green-500",  onClick: () => onNavigate("utilisateurs") },
    { icon: Building,     label: "Filieres",      value: stats?.filieres     ?? "—", iconBg: "bg-orange-50", iconColor: "text-orange-500", onClick: () => onNavigate("filieres") },
    { icon: BookOpen,     label: "Cours",         value: stats?.cours        ?? "—", iconBg: "bg-sky-50",    iconColor: "text-sky-500",    onClick: () => onNavigate("cours") },
    { icon: TrendingUp,   label: "Moy. generale", value: stats?.moyGenerale  != null ? stats.moyGenerale  : "—", iconBg: "bg-teal-50",  iconColor: "text-teal-500",  onClick: () => onNavigate("notes") },
    { icon: Target,       label: "Taux reussite", value: stats?.tauxReussite != null ? `${stats.tauxReussite}%` : "—", iconBg: "bg-red-50", iconColor: "text-red-500", onClick: () => onNavigate("notes") },
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader className="h-6 w-6 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-5 bg-gray-50 min-h-screen p-4">

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ icon: Icon, label, value, iconBg, iconColor, onClick }) => (
          <button key={label} onClick={onClick}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Graphiques ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-blue-500" /> Evolution des inscriptions
          </h2>
          {inscriptionsData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
              Pas de données d'inscription disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={inscriptionsData} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke="#F0F0F0" strokeDasharray="4 4" />
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#EFF6FF", radius: 6 }} />
                <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-2">Repartition par filiere</h2>
          {filieresData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">Aucune filière</div>
          ) : (
            <>
              <div className="flex justify-center">
                <PieChart width={180} height={180}>
                  <Pie data={filieresData} cx={90} cy={90} innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                    {filieresData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                </PieChart>
              </div>
              <FilieresLegend data={filieresData} />
            </>
          )}
        </div>
      </div>

      {/* ── Cours du jour + Utilisateurs récents ────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" /> Utilisateurs récents
            </h2>
            <button onClick={() => onNavigate("utilisateurs")} className="text-xs text-blue-600 hover:underline">Gérer</button>
          </div>
          {recentUsers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="h-10 w-10 text-gray-200 mb-2" />
              <p className="text-gray-500 text-sm">Aucun utilisateur</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentUsers.map(u => {
                const RC = { ETUDIANT: "bg-green-100 text-green-700", ENSEIGNANT: "bg-yellow-100 text-yellow-700" };
                const RL = { ETUDIANT: "Étudiant", ENSEIGNANT: "Enseignant" };
                return (
                  <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.prenom?.[0] || ""}{u.nom?.[0] || ""}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${RC[u.role] || "bg-gray-100"}`}>
                      {RL[u.role] || u.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Annonces récentes ─────────────────────────────────────────── */}
      {annonces.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-500" /> Dernières annonces
            </h2>
            <button onClick={() => onNavigate("annonces")} className="text-xs text-blue-600 hover:underline">Gérer</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {annonces.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                    {a.priority === "urgent" ? "🔴 Urgent" : "📢 Info"}
                  </span>
                  <span className="text-[10px] text-gray-400">{a.audience}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}