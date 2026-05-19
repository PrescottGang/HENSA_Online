// src/components/enseignant/MesCours.jsx
import { useState, useEffect, useMemo } from "react";
import {
  BookOpen, Clock, MapPin, Users, Search,
  Calendar, CheckCircle2, Timer, XCircle,
  GraduationCap, LayoutGrid, List, ChevronDown,
  Loader, AlertCircle, BookMarked, School, Filter,
} from "lucide-react";
import axios from "axios";

// ─── Config Axios (même pattern que le reste de l'app) ────────────────────────
const API = "http://localhost:5000/api";
const api = axios.create({ baseURL: API });
api.interceptors.request.use(c => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtH = t => t?.slice(0, 5) ?? "";

const fmtDateShort = d => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// ─── Métadonnées visuelles ────────────────────────────────────────────────────
const TYPE_META = {
  CM: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  TD: { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  TP: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
};

const STATUT_META = {
  PLANIFIEE: { label: "Planifié",  bg: "bg-orange-100",  text: "text-orange-700",  Icon: Timer        },
  TERMINEE:  { label: "Terminé",   bg: "bg-emerald-100", text: "text-emerald-700", Icon: CheckCircle2 },
  ANNULEE:   { label: "Annulé",    bg: "bg-red-100",     text: "text-red-700",     Icon: XCircle      },
};

const TypeBadge = ({ type }) => {
  const m = TYPE_META[type] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {type}
    </span>
  );
};

const StatutBadge = ({ statut }) => {
  const m = STATUT_META[statut] ?? { label: statut, bg: "bg-gray-100", text: "text-gray-600", Icon: AlertCircle };
  const { Icon } = m;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
};

// ─── Carte séance — vue grille ────────────────────────────────────────────────
const SeanceCard = ({ s }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {s.matiere_nom ?? s.cours_nom}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {s.filiere_nom} · {s.niveau_nom}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <TypeBadge type={s.type_cours} />
        <StatutBadge statut={s.statut} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
        {fmtDateShort(s.date)}
      </span>
      <span className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
        {fmtH(s.heure_debut)} – {fmtH(s.heure_fin)}
      </span>
      <span className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
        {s.salle_nom}
      </span>
      <span className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
        {s.classe_nom}
      </span>
    </div>

    {s.semestre_libelle && (
      <p className="text-[10px] text-gray-300 border-t border-gray-50 pt-2">
        {s.semestre_libelle}
        {s.matiere_code && <> · <span className="font-mono">{s.matiere_code}</span></>}
      </p>
    )}
  </div>
);

// ─── Ligne séance — vue liste ─────────────────────────────────────────────────
const SeanceRow = ({ s }) => (
  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-4 hover:shadow-sm transition">
    {/* Mini calendrier */}
    <div className="text-center w-11 flex-shrink-0">
      <p className="text-lg font-bold text-gray-900 leading-none">
        {new Date(s.date).getDate()}
      </p>
      <p className="text-[10px] text-gray-400 uppercase">
        {new Date(s.date).toLocaleDateString("fr-FR", { month: "short" })}
      </p>
    </div>

    <div className="w-px h-9 bg-gray-100 flex-shrink-0" />

    {/* Matière + filière */}
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-900 truncate">{s.matiere_nom ?? s.cours_nom}</p>
      <p className="text-xs text-gray-400 truncate">{s.filiere_nom} · {s.niveau_nom} · {s.classe_nom}</p>
    </div>

    <TypeBadge type={s.type_cours} />

    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 w-24">
      <Clock className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
      {fmtH(s.heure_debut)} – {fmtH(s.heure_fin)}
    </div>

    <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 w-20">
      <MapPin className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
      <span className="truncate">{s.salle_nom}</span>
    </div>

    <StatutBadge statut={s.statut} />
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MesCours() {
  const [seances,  setSeances]  = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Filtres locaux
  const [search,      setSearch]      = useState("");
  const [filtStatut,  setFiltStatut]  = useState("TOUS");
  const [filtMatiere, setFiltMatiere] = useState("TOUS");
  const [filtType,    setFiltType]    = useState("TOUS");
  const [vue,         setVue]         = useState("grille");

  // ── Chargement (même pattern que le dashboard) ───────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [seancesRes, matieresRes, statsRes] = await Promise.all([
          api.get("/mes-cours/seances"),
          api.get("/mes-cours/matieres"),
          api.get("/mes-cours/stats"),
        ]);
        setSeances(seancesRes.data   || []);
        setMatieres(matieresRes.data || []);
        setStats(statsRes.data       || null);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger vos cours. Vérifiez votre connexion.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Filtrage côté client ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return seances.filter(s => {
      if (filtStatut  !== "TOUS" && s.statut     !== filtStatut)              return false;
      if (filtMatiere !== "TOUS" && String(s.matiere_id) !== filtMatiere)     return false;
      if (filtType    !== "TOUS" && s.type_cours  !== filtType)               return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.matiere_nom?.toLowerCase().includes(q) &&
          !s.cours_nom?.toLowerCase().includes(q)   &&
          !s.classe_nom?.toLowerCase().includes(q)  &&
          !s.salle_nom?.toLowerCase().includes(q)   &&
          !s.filiere_nom?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [seances, filtStatut, filtMatiere, filtType, search]);

  const hasFilters = filtStatut !== "TOUS" || filtMatiere !== "TOUS" || filtType !== "TOUS" || search;
  const resetFilters = () => { setFiltStatut("TOUS"); setFiltMatiere("TOUS"); setFiltType("TOUS"); setSearch(""); };

  // ─── Loader ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader className="h-6 w-6 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-gray-600 text-sm">{error}</p>
      <button onClick={() => window.location.reload()} className="text-xs text-blue-600 underline">
        Réessayer
      </button>
    </div>
  );

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 bg-gray-50 min-h-screen p-4">

      {/* ── Titre page ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-blue-500" /> Mes Cours
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Historique et planning de toutes vos séances
        </p>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { Icon: GraduationCap, label: "Matières attribuées", value: matieres.length,              bg: "bg-blue-50",    ic: "text-blue-500"    },
            { Icon: CheckCircle2,  label: "Terminées",           value: stats.seances_terminees  ?? 0, bg: "bg-emerald-50", ic: "text-emerald-500" },
            { Icon: Timer,         label: "Planifiées",          value: stats.seances_planifiees ?? 0, bg: "bg-orange-50",  ic: "text-orange-500"  },
            { Icon: XCircle,       label: "Annulées",            value: stats.seances_annulees   ?? 0, bg: "bg-red-50",     ic: "text-red-400"     },
            { Icon: School,        label: "Classes",             value: stats.nb_classes         ?? 0, bg: "bg-purple-50",  ic: "text-purple-500"  },
            { Icon: Clock,         label: "Heures totales",      value: stats.heures_total != null ? `${stats.heures_total}h` : "—", bg: "bg-indigo-50", ic: "text-indigo-500" },
          ].map(({ Icon, label, value, bg, ic }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${ic}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtres ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-3">

          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher matière, classe, salle, filière…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Statut */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <select
              value={filtStatut}
              onChange={e => setFiltStatut(e.target.value)}
              className="pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none bg-white"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="PLANIFIEE">Planifié</option>
              <option value="TERMINEE">Terminé</option>
              <option value="ANNULEE">Annulé</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Matière */}
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <select
              value={filtMatiere}
              onChange={e => setFiltMatiere(e.target.value)}
              className="pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none bg-white max-w-[200px]"
            >
              <option value="TOUS">Toutes les matières</option>
              {matieres.map(m => (
                <option key={m.matiere_id} value={String(m.matiere_id)}>
                  {m.matiere_nom}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Type de cours */}
          <div className="relative">
            <select
              value={filtType}
              onChange={e => setFiltType(e.target.value)}
              className="px-3 pr-7 py-2 text-sm border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none bg-white"
            >
              <option value="TOUS">Tous types</option>
              <option value="CM">CM</option>
              <option value="TD">TD</option>
              <option value="TP">TP</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Toggle grille / liste */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
            <button
              onClick={() => setVue("grille")}
              className={`p-1.5 rounded-lg transition ${vue === "grille" ? "bg-white shadow text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              title="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVue("liste")}
              className={`p-1.5 rounded-lg transition ${vue === "liste" ? "bg-white shadow text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compteur */}
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">
            {filtered.length} séance{filtered.length > 1 ? "s" : ""}
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-blue-500 hover:underline">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* ── Résultats ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <School className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Aucune séance trouvée</p>
          <p className="text-gray-400 text-sm mt-1">
            {hasFilters ? "Essayez de modifier vos filtres" : "Vous n'avez pas encore de séances planifiées"}
          </p>
        </div>
      ) : vue === "grille" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(s => <SeanceCard key={s.id} s={s} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => <SeanceRow key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}