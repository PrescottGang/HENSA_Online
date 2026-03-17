// src/components/dashbord/DashboardAdmin.jsx
import { useState, useEffect } from "react";
import {
  Users, BookOpen, Calendar, TrendingUp,
  GraduationCap, Clock, MapPin, Loader,
  ChevronRight, Bell, Megaphone, Building,
  AlertCircle, CheckCircle, BarChart2
} from "lucide-react";
import axios from "axios";

const API = "http://localhost:5000/api";
const api = axios.create({ baseURL: API });
api.interceptors.request.use(c => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const fmtH = t => t?.slice(0,5) ?? "";
const TYPE_COLORS = {
  CM:"bg-blue-100 text-blue-700",
  TD:"bg-green-100 text-green-700",
  TP:"bg-purple-100 text-purple-700",
};

export default function DashboardAdmin({ onNavigate }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [stats,        setStats]        = useState(null);
  const [seancesAuj,   setSeancesAuj]   = useState([]);
  const [notifications,setNotifs]       = useState([]);
  const [annonces,     setAnnonces]     = useState([]);
  const [recentUsers,  setRecentUsers]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, notifsRes, annoncesRes, semsRes] = await Promise.all([
          api.get("/users/etudiants"),
          api.get("/notifications?limit=5"),
          api.get("/announcements?limit=4"),
          api.get("/cours/semaines"),
        ]);

        const etuds = usersRes.data || [];
        const ensRes = await api.get("/users/enseignants");
        const enss = ensRes.data || [];

        setNotifs(notifsRes.data || []);
        setAnnonces(annoncesRes.data || []);
        setRecentUsers([...etuds, ...enss]
          .sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
          .slice(0,5)
        );
        setStats({
          etudiants:  etuds.length,
          enseignants: enss.length,
          actifs:     etuds.filter(e=>e.statut==="ACTIF").length,
        });

        // Semaine courante → séances
        const semaines = semsRes.data || [];
        const today = new Date().toISOString().slice(0,10);
        const current = semaines.find(s=>s.date_debut<=today&&s.date_fin>=today)
                     || semaines.find(s=>s.date_debut>=today)
                     || semaines[0];
        if (current) {
          const r = await api.get(`/cours/seances?semaine_id=${current.id}`);
          setSeancesAuj((r.data||[]).filter(s=>s.date?.slice(0,10)===today&&s.statut==="PLANIFIEE"));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const notifsNonLues = notifications.filter(n=>!n.lu).length;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader className="h-6 w-6 animate-spin text-blue-500"/>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Bienvenue ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">Administration 🎓</p>
            <h1 className="text-2xl font-bold mt-0.5">{user.prenom} {user.nom}</h1>
            <p className="text-blue-300 text-sm mt-1">
              {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <BarChart2 className="h-8 w-8 text-white"/>
          </div>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: GraduationCap, label:"Étudiants",         value: stats?.etudiants||0,   color:"bg-blue-50 text-blue-600",   onClick:()=>onNavigate("utilisateurs") },
          { icon: Users,         label:"Enseignants",        value: stats?.enseignants||0, color:"bg-emerald-50 text-emerald-600", onClick:()=>onNavigate("utilisateurs") },
          { icon: Calendar,      label:"Cours aujourd'hui",  value: seancesAuj.length,     color:"bg-purple-50 text-purple-600", onClick:()=>onNavigate("emploi-du-temps") },
          { icon: Bell,          label:"Notifications",      value: notifsNonLues||0,      color:"bg-orange-50 text-orange-600", onClick:()=>onNavigate("notifications") },
        ].map(({ icon: Icon, label, value, color, onClick }) => (
          <button key={label} onClick={onClick}
            className="bg-white rounded-2xl border border-gray-200 p-4 text-left hover:shadow-md transition group">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="h-5 w-5"/>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 mt-1 transition"/>
          </button>
        ))}
      </div>

      {/* ── Accès rapides ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar,    label:"Emploi du temps",  desc:"Programmer des cours",  page:"emploi-du-temps", color:"from-blue-500 to-blue-600" },
          { icon: BookOpen,    label:"Notes",            desc:"Consulter les résultats",page:"notes",           color:"from-green-500 to-green-600" },
          { icon: Users,       label:"Utilisateurs",     desc:"Gérer les comptes",      page:"utilisateurs",    color:"from-purple-500 to-purple-600" },
          { icon: Megaphone,   label:"Annonces",         desc:"Publier une annonce",    page:"annonces",        color:"from-orange-500 to-orange-600" },
        ].map(({ icon: Icon, label, desc, page, color }) => (
          <button key={page} onClick={() => onNavigate(page)}
            className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white text-left hover:shadow-lg transition hover:scale-[1.02] active:scale-100`}>
            <Icon className="h-6 w-6 mb-3 opacity-90"/>
            <p className="text-sm font-bold">{label}</p>
            <p className="text-xs opacity-75 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Cours du jour ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500"/> Cours d'aujourd'hui
            </h2>
            <button onClick={() => onNavigate("emploi-du-temps")}
              className="text-xs text-blue-600 hover:underline">Gérer</button>
          </div>
          {seancesAuj.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-300 mb-2"/>
              <p className="text-gray-500 text-sm">Aucun cours planifié aujourd'hui</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {seancesAuj.sort((a,b)=>a.heure_debut.localeCompare(b.heure_debut)).map(s => (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.type_cours]||"bg-gray-100 text-gray-600"}`}>
                      {s.type_cours}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 truncate flex-1">{s.matiere_nom||s.cours_nom}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{fmtH(s.heure_debut)}–{fmtH(s.heure_fin)}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{s.salle_nom}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{s.classe_nom}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">👤 {s.enseignant_prenom} {s.enseignant_nom}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Utilisateurs récents ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500"/> Utilisateurs récents
            </h2>
            <button onClick={() => onNavigate("utilisateurs")}
              className="text-xs text-blue-600 hover:underline">Gérer</button>
          </div>
          {recentUsers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="h-10 w-10 text-gray-200 mb-2"/>
              <p className="text-gray-500 text-sm">Aucun utilisateur</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentUsers.map(u => {
                const ROLE_COLORS = { ETUDIANT:"bg-green-100 text-green-700", ENSEIGNANT:"bg-yellow-100 text-yellow-700" };
                const ROLE_LABELS = { ETUDIANT:"Étudiant", ENSEIGNANT:"Enseignant" };
                return (
                  <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(u.prenom?.[0]||"")}{ (u.nom?.[0]||"")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ROLE_COLORS[u.role]||"bg-gray-100"}`}>
                      {ROLE_LABELS[u.role]||u.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Annonces récentes ───────────────────────────────────────── */}
      {annonces.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-500"/> Dernières annonces
            </h2>
            <button onClick={() => onNavigate("annonces")} className="text-xs text-blue-600 hover:underline">Gérer</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {annonces.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.priority==="urgent"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>
                    {a.priority==="urgent"?"🔴 Urgent":"📢 Info"}
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