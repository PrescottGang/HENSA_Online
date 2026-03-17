// src/components/dashbord/DashboardEnseignant.jsx
import { useState, useEffect } from "react";
import {
  BookOpen, Calendar, ClipboardList, Users,
  Clock, MapPin, Loader, ChevronRight,
  TrendingUp, CheckCircle, Bell, Award
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

export default function DashboardEnseignant({ onNavigate }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [seancesAuj,   setSeancesAuj]   = useState([]);
  const [seancesSem,   setSeancesSem]   = useState([]);
  const [mesMatieres,  setMesMatieres]  = useState([]);
  const [notifications,setNotifs]       = useState([]);
  const [annonces,     setAnnonces]     = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [semsRes, matsRes, notifsRes, annoncesRes] = await Promise.all([
          api.get("/cours/semaines"),
          api.get("/cours/mes-matieres"),
          api.get("/notifications?limit=5"),
          api.get("/announcements?limit=3"),
        ]);

        const semaines = semsRes.data || [];
        setMesMatieres(matsRes.data || []);
        setNotifs(notifsRes.data || []);
        setAnnonces(annoncesRes.data || []);

        // Trouver semaine courante
        const today = new Date().toISOString().slice(0,10);
        const current = semaines.find(s => s.date_debut <= today && s.date_fin >= today)
                     || semaines.find(s => s.date_debut >= today)
                     || semaines[0];

        if (current) {
          const r = await api.get(`/cours/seances?semaine_id=${current.id}`);
          const all = r.data || [];
          const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
          setSeancesAuj(all.filter(s => s.date?.slice(0,10) === today && s.statut==="PLANIFIEE"));
          setSeancesSem(all.filter(s => s.date?.slice(0,10) > today && s.statut==="PLANIFIEE").slice(0,8));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Classes distinctes
  const classesDistinctes = [...new Map(mesMatieres.map(m => [m.classe_id, m])).values()];
  const notifsNonLues = notifications.filter(n=>!n.lu).length;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader className="h-6 w-6 animate-spin text-blue-500"/>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Bienvenue ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">Espace enseignant 👨‍🏫</p>
            <h1 className="text-2xl font-bold mt-0.5">{user.prenom} {user.nom}</h1>
            <p className="text-emerald-200 text-sm mt-1">
              {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Award className="h-8 w-8 text-white"/>
          </div>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookOpen,      label:"Matières dispensées", value: mesMatieres.length,    color:"bg-blue-50 text-blue-600",   onClick:()=>onNavigate("notes") },
          { icon: Users,         label:"Classes",             value: classesDistinctes.length, color:"bg-emerald-50 text-emerald-600", onClick:()=>onNavigate("notes") },
          { icon: Calendar,      label:"Cours aujourd'hui",   value: seancesAuj.length,     color:"bg-purple-50 text-purple-600", onClick:()=>onNavigate("emploi-du-temps") },
          { icon: Bell,          label:"Notifications",       value: notifsNonLues||0,      color:"bg-orange-50 text-orange-600", onClick:()=>onNavigate("notifications") },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Cours du jour ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500"/> Cours du jour
            </h2>
            <button onClick={() => onNavigate("emploi-du-temps")}
              className="text-xs text-blue-600 hover:underline">Emploi du temps</button>
          </div>
          {seancesAuj.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-300 mb-2"/>
              <p className="text-gray-500 text-sm font-medium">Aucun cours aujourd'hui</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {seancesAuj.sort((a,b)=>a.heure_debut.localeCompare(b.heure_debut)).map(s => (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.type_cours]||"bg-gray-100 text-gray-600"}`}>
                      {s.type_cours}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.matiere_nom||s.cours_nom}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{fmtH(s.heure_debut)}–{fmtH(s.heure_fin)}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{s.salle_nom}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{s.classe_nom}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Mes matières ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500"/> Mes matières
            </h2>
            <button onClick={() => onNavigate("notes")}
              className="text-xs text-blue-600 hover:underline">Saisir notes</button>
          </div>
          {mesMatieres.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <BookOpen className="h-10 w-10 text-gray-200 mb-2"/>
              <p className="text-gray-500 text-sm">Aucune matière assignée</p>
              <p className="text-xs text-gray-400 mt-1">Des séances doivent être programmées</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {mesMatieres.slice(0,6).map((m,i) => (
                <div key={`${m.matiere_id}-${m.classe_id}`} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">{m.matiere_code?.slice(0,2)||String(i+1).padStart(2,"0")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.matiere_nom}</p>
                    <p className="text-xs text-gray-400 truncate">{m.classe_nom} · {m.semestre_libelle}</p>
                  </div>
                  <button onClick={() => onNavigate("notes")}
                    className="text-blue-500 hover:text-blue-700 transition flex-shrink-0">
                    <ChevronRight className="h-4 w-4"/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Prochains cours de la semaine ───────────────────────────── */}
      {seancesSem.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500"/> Prochains cours
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4">
            {seancesSem.map(s => (
              <div key={s.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.type_cours]||"bg-gray-100 text-gray-600"}`}>
                    {s.type_cours}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{s.matiere_nom||s.cours_nom}</p>
                <p className="text-xs text-gray-400">{fmtH(s.heure_debut)}–{fmtH(s.heure_fin)} · {s.salle_nom}</p>
                <p className="text-xs text-gray-400 truncate">{s.classe_nom}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Annonces ────────────────────────────────────────────────── */}
      {annonces.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500"/> Annonces récentes
            </h2>
            <button onClick={() => onNavigate("annonces")} className="text-xs text-blue-600 hover:underline">Voir tout</button>
          </div>
          <div className="divide-y divide-gray-50">
            {annonces.map(a => (
              <div key={a.id} className="px-5 py-3.5">
                <p className="text-sm font-medium text-gray-800">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}