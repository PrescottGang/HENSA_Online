// src/components/dashbord/DashboardEtudiant.jsx
import { useState, useEffect } from "react";
import {
  BookOpen, Calendar, ClipboardList, TrendingUp,
  Clock, MapPin, CheckCircle, AlertCircle, Loader,
  ChevronRight, GraduationCap, Award, Bell
} from "lucide-react";
import axios from "axios";

const API      = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";
const api = axios.create({ baseURL: API });
api.interceptors.request.use(c => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const fmtH    = t => t?.slice(0,5) ?? "";
const fmtDate = d => new Date(d).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
const mention = m => m===null?null:m>=16?"Très bien":m>=14?"Bien":m>=12?"Assez bien":m>=10?"Passable":"Insuffisant";
const mentionColor = m => m===null?"":m>=16?"text-blue-600":m>=14?"text-green-600":m>=12?"text-yellow-600":m>=10?"text-orange-500":"text-red-500";

const TYPE_COLORS = {
  CM:"bg-blue-100 text-blue-700",
  TD:"bg-green-100 text-green-700",
  TP:"bg-purple-100 text-purple-700",
};

// Trouver la semaine courante ou prochaine
function getSemaineLabel(d) {
  return `Semaine du ${new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}`;
}

export default function DashboardEtudiant({ onNavigate }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [seances,      setSeances]      = useState([]);
  const [notes,        setNotes]        = useState([]);
  const [notifications,setNotifs]       = useState([]);
  const [annonces,     setAnnonces]     = useState([]);
  const [semaines,     setSemaines]     = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [semsRes, notesRes, notifsRes, annoncesRes] = await Promise.all([
          api.get("/cours/semaines"),
          api.get("/cours/notes/etudiant"),
          api.get("/notifications?limit=5"),
          api.get("/announcements?limit=3"),
        ]);
        setSemaines(semsRes.data || []);
        setNotes(notesRes.data || []);
        setNotifs(notifsRes.data || []);
        setAnnonces(annoncesRes.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Trouver la semaine la plus proche d'aujourd'hui
  useEffect(() => {
    if (!semaines.length) return;
    const today = new Date().toISOString().slice(0,10);
    // Chercher la semaine qui contient aujourd'hui ou la prochaine
    const current = semaines.find(s => s.date_debut <= today && s.date_fin >= today)
                 || semaines.find(s => s.date_debut >= today)
                 || semaines[0];
    if (current) {
      api.get(`/cours/seances?semaine_id=${current.id}`)
        .then(r => setSeances(r.data || []))
        .catch(console.error);
    }
  }, [semaines]);

  // Aujourd'hui et demain
  const today = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const seancesAuj = seances.filter(s => s.date?.slice(0,10) === today && s.statut==="PLANIFIEE");
  const seancesDem = seances.filter(s => s.date?.slice(0,10) === tomorrow && s.statut==="PLANIFIEE");

  // Stats notes
  const moyennes = notes.map(n=>n.moyenne).filter(m=>m!==null);
  const moyGen   = moyennes.length ? Math.round(moyennes.reduce((a,b)=>a+b,0)/moyennes.length*100)/100 : null;
  const notifsNonLues = notifications.filter(n=>!n.lu).length;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader className="h-6 w-6 animate-spin text-blue-500"/>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Bienvenue ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Bienvenue 👋</p>
            <h1 className="text-2xl font-bold mt-0.5">{user.prenom} {user.nom}</h1>
            <p className="text-blue-200 text-sm mt-1">
              {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white"/>
          </div>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ClipboardList, label:"Matières évaluées", value: notes.filter(n=>n.moyenne!==null).length, color:"bg-blue-50 text-blue-600", onClick: ()=>onNavigate("notes") },
          { icon: TrendingUp,    label:"Moyenne générale",  value: moyGen!==null ? `${moyGen}/20` : "—",   color:"bg-green-50 text-green-600", onClick: ()=>onNavigate("notes") },
          { icon: Calendar,      label:"Cours aujourd'hui", value: seancesAuj.length,                       color:"bg-purple-50 text-purple-600", onClick: ()=>onNavigate("emploi-du-temps") },
          { icon: Bell,          label:"Notifications",     value: notifsNonLues||0,                        color:"bg-orange-50 text-orange-600", onClick: ()=>onNavigate("notifications") },
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
              <Calendar className="h-4 w-4 text-blue-500"/> Cours d'aujourd'hui
            </h2>
            <button onClick={() => onNavigate("emploi-du-temps")}
              className="text-xs text-blue-600 hover:underline">Voir tout</button>
          </div>
          {seancesAuj.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-300 mb-2"/>
              <p className="text-gray-500 text-sm font-medium">Aucun cours aujourd'hui</p>
              {seancesDem.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{seancesDem.length} cours demain</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {seancesAuj.sort((a,b)=>a.heure_debut.localeCompare(b.heure_debut)).map(s => (
                <div key={s.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.type_cours]||"bg-gray-100 text-gray-600"}`}>
                      {s.type_cours}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.matiere_nom || s.cours_nom}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3"/> {fmtH(s.heure_debut)}–{fmtH(s.heure_fin)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3"/> {s.salle_nom}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.enseignant_prenom} {s.enseignant_nom}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Dernières notes ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-green-500"/> Mes notes récentes
            </h2>
            <button onClick={() => onNavigate("notes")}
              className="text-xs text-blue-600 hover:underline">Voir tout</button>
          </div>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <BookOpen className="h-10 w-10 text-gray-200 mb-2"/>
              <p className="text-gray-500 text-sm">Aucune note disponible</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notes.slice(0,5).map(n => (
                <div key={n.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.matiere_nom}</p>
                    <p className="text-xs text-gray-400">{n.semestre_libelle}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    {n.cc!=null && <span className="text-gray-500">CC: <b>{n.cc}</b></span>}
                    {n.ef!=null && <span className="text-gray-500">EF: <b>{n.ef}</b></span>}
                    {n.moyenne!=null && (
                      <span className={`font-bold text-sm ${n.moyenne>=10?"text-green-600":"text-red-500"}`}>
                        {n.moyenne}/20
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Mention générale */}
          {moyGen !== null && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Moyenne générale</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${moyGen>=10?"text-green-600":"text-red-500"}`}>{moyGen}/20</span>
                <span className={`text-xs font-medium ${mentionColor(moyGen)}`}>{mention(moyGen)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Prochains cours (demain) ────────────────────────────────── */}
      {seancesDem.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500"/> Cours de demain
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4">
            {seancesDem.sort((a,b)=>a.heure_debut.localeCompare(b.heure_debut)).map(s => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${TYPE_COLORS[s.type_cours]||"bg-gray-100 text-gray-600"}`}>
                  {s.type_cours}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.matiere_nom||s.cours_nom}</p>
                  <p className="text-xs text-gray-400">{fmtH(s.heure_debut)}–{fmtH(s.heure_fin)} · {s.salle_nom}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Annonces récentes ───────────────────────────────────────── */}
      {annonces.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500"/> Annonces récentes
            </h2>
            <button onClick={() => onNavigate("annonces")}
              className="text-xs text-blue-600 hover:underline">Voir tout</button>
          </div>
          <div className="divide-y divide-gray-50">
            {annonces.map(a => (
              <div key={a.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.priority==="urgent"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>
                    {a.priority==="urgent" ? "🔴 Urgent" : "📢 Info"}
                  </span>
                </div>
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