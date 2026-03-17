// src/components/dashbord/EmploiDuTemps.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Clock,
  MapPin, Loader, Trash2, Edit3, AlertCircle, Check,
  ChevronDown, GraduationCap, Layers
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const JOURS    = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const CRENEAUX = ["07:00","08:00","09:00","10:00","11:00","12:00",
                  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
const TYPE_COLORS = {
  CM: { bg:"bg-blue-500",   light:"bg-blue-50 border-blue-200",    text:"text-blue-700",   badge:"bg-blue-100 text-blue-700"   },
  TD: { bg:"bg-green-500",  light:"bg-green-50 border-green-200",  text:"text-green-700",  badge:"bg-green-100 text-green-700" },
  TP: { bg:"bg-purple-500", light:"bg-purple-50 border-purple-200",text:"text-purple-700", badge:"bg-purple-100 text-purple-700"},
};

const fmtH     = t => t?.slice(0,5) ?? "";
const dayIndex = d => { const w = new Date(d).getDay(); return w === 0 ? 6 : w - 1; };
const isoDate  = d => d.toISOString().slice(0,10);
const fmtShort = d => new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});

// Titre de la semaine : "Semaine du 16 mars 2026"
const semaineLabel = d =>
  `Semaine du ${new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}`;

// ─── Select ───────────────────────────────────────────────────────────────────
function Select({ label, value, onChange, options, placeholder="Sélectionner...", disabled=false }) {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => String(o.value) === String(value));
  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <button type="button" disabled={disabled}
        onClick={() => setOpen(v=>!v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left transition
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                     : "bg-white border-gray-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-200"}`}>
        <span className={`${sel ? "text-gray-800" : "text-gray-400"} truncate pr-2`}>{sel?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open?"rotate-180":""}`}/>
      </button>
      {open && !disabled && (
        <div className="absolute z-[60] mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-56 overflow-y-auto">
          {options.length === 0
            ? <p className="p-3 text-sm text-gray-400 text-center">Aucune option</p>
            : options.map(o => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition
                  ${String(o.value)===String(value) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-800"}`}>
                {o.label}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type==="success" ? "bg-green-600":"bg-red-600"}`}>
      {type==="success" ? <Check className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
      <span className="max-w-xs">{msg}</span>
      <button onClick={onClose}><X className="h-3.5 w-3.5 ml-1"/></button>
    </div>
  );
}

// ─── SeanceCard ───────────────────────────────────────────────────────────────
function SeanceCard({ seance, isAdmin, onEdit, onDelete, onCancel }) {
  const tc     = TYPE_COLORS[seance.type_cours] || TYPE_COLORS.CM;
  const annule = seance.statut === "ANNULEE";
  return (
    <div className={`relative rounded-xl border p-2.5 text-xs group transition
      ${annule ? "bg-gray-50 border-gray-200 opacity-50" : tc.light}`}>
      {annule && (
        <span className="absolute top-1 right-1 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
          Annulé
        </span>
      )}
      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1 ${tc.badge}`}>
        {seance.type_cours}
      </span>
      <p className={`font-semibold leading-tight mb-1 ${annule ? "text-gray-400 line-through" : tc.text}`}>
        {seance.matiere_nom || seance.cours_nom}
      </p>
      <div className="space-y-0.5 text-gray-500">
        <div className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 flex-shrink-0"/>{fmtH(seance.heure_debut)}–{fmtH(seance.heure_fin)}</div>
        <div className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 flex-shrink-0"/>{seance.salle_nom}</div>
        <div className="flex items-center gap-1 truncate">
          <GraduationCap className="h-2.5 w-2.5 flex-shrink-0"/>
          <span className="truncate">{seance.enseignant_prenom} {seance.enseignant_nom}</span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 text-[9px] mt-0.5 text-gray-400">
            <Layers className="h-2.5 w-2.5 flex-shrink-0"/>
            <span className="truncate">{seance.classe_nom}</span>
          </div>
        )}
      </div>
      {isAdmin && !annule && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(seance)}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition text-[10px]">
            <Edit3 className="h-2.5 w-2.5"/> Modifier
          </button>
          <button onClick={() => onCancel(seance)}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 transition text-[10px]">
            <X className="h-2.5 w-2.5"/> Annuler
          </button>
          <button onClick={() => onDelete(seance.id)}
            className="flex items-center justify-center p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition">
            <Trash2 className="h-2.5 w-2.5"/>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Modal programmer cours (multi-jours) ─────────────────────────────────────
function ModalSeance({ semaine, onClose, onSaved, data }) {
  const isEdit = !!data?.id;

  const [form, setForm] = useState({
    heure_debut:   data?.heure_debut?.slice(0,5) || "",
    heure_fin:     data?.heure_fin?.slice(0,5)   || "",
    classe_id:     data?.classe_id    || "",
    semestre_id:   data?.semestre_id  || "",
    matiere_id:    data?.matiere_id   || "",
    enseignant_id: data?.enseignant_id || "",
    salle_id:      data?.salle_id     || "",
    type_cours:    data?.type_cours   || "CM",
  });
  // Multi-jours : tableau de dates ISO sélectionnées
  const [selectedDates, setSelectedDates] = useState(
    data?.date ? [data.date.slice(0,10)] : []
  );

  const [classes,     setClasses]     = useState([]);
  const [semestres,   setSemestres]   = useState([]);
  const [matieres,    setMatieres]    = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [salles,      setSalles]      = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  // Toutes les dates de la semaine (lundi → samedi)
  const datesInWeek = [];
  if (semaine?.date_debut) {
    const start = new Date(semaine.date_debut);
    for (let i = 0; i < 6; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      datesInWeek.push({ iso: isoDate(d), label: JOURS[i], short: fmtShort(d) });
    }
  }

  const toggleDate = iso => {
    setSelectedDates(p =>
      p.includes(iso) ? p.filter(d => d !== iso) : [...p, iso]
    );
  };

  useEffect(() => {
    Promise.all([
      api.get("/cours/classes"),
      api.get("/cours/enseignants"),
      api.get("/cours/salles"),
    ]).then(([c,e,s]) => {
      setClasses(c.data); setEnseignants(e.data); setSalles(s.data);
    });
  }, []);

  useEffect(() => {
    if (!form.classe_id) { setSemestres([]); setMatieres([]); return; }
    api.get(`/cours/semestres?classe_id=${form.classe_id}`).then(r => setSemestres(r.data));
    setForm(f => ({ ...f, semestre_id:"", matiere_id:"" }));
  }, [form.classe_id]);

  useEffect(() => {
    if (!form.classe_id || !form.semestre_id) { setMatieres([]); return; }
    api.get(`/cours/matieres?classe_id=${form.classe_id}&semestre_id=${form.semestre_id}`)
      .then(r => setMatieres(r.data));
    setForm(f => ({ ...f, matiere_id:"" }));
  }, [form.classe_id, form.semestre_id]);

  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async () => {
    setError("");
    if (!isEdit && !selectedDates.length) return setError("Sélectionnez au moins un jour.");
    if (!form.heure_debut || !form.heure_fin) return setError("Horaires requis.");
    if (form.heure_fin <= form.heure_debut) return setError("Heure de fin doit être après l'heure de début.");
    if (!form.classe_id || !form.enseignant_id || !form.salle_id) return setError("Classe, enseignant et salle requis.");

    setSaving(true);
    try {
      // Récupérer ou créer un cours générique
      let cours_id;
      const coursRes = await api.get(`/cours/cours-list?classe_id=${form.classe_id}`);
      cours_id = coursRes.data[0]?.id;
      if (!cours_id) {
        const classeInfo = classes.find(c => String(c.id) === String(form.classe_id));
        const cr = await api.post("/cours/cours-list-create", {
          nom: classeInfo?.nom || "Cours",
          classe_id: form.classe_id,
          semestre_id: form.semestre_id || 1,
        });
        cours_id = cr.data.id;
      }

      if (isEdit) {
        await api.patch(`/cours/seances/${data.id}`, {
          heure_debut: form.heure_debut+":00",
          heure_fin:   form.heure_fin+":00",
          salle_id:    form.salle_id,
          enseignant_id: form.enseignant_id,
          matiere_id:  form.matiere_id || null,
          type_cours:  form.type_cours,
        });
      } else {
        const r = await api.post("/cours/seances", {
          ...form,
          cours_id,
          dates:       selectedDates,
          heure_debut: form.heure_debut+":00",
          heure_fin:   form.heure_fin+":00",
          semaine_id:  semaine.id,
          matiere_id:  form.matiere_id || null,
        });
        if (r.data.errors?.length) {
          if (r.data.created?.length) {
            onSaved(`${r.data.created.length} séance(s) créée(s). Conflits : ${r.data.errors.join(" | ")}`);
            return;
          }
          return setError(r.data.errors.join(" | "));
        }
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? "Modifier la séance" : "Programmer un cours"}
            </h2>
            {semaine && (
              <p className="text-xs text-gray-400 mt-0.5">
                {semaineLabel(semaine.date_debut)}
              </p>
            )}
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400 hover:text-gray-600"/></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5"/> <span>{error}</span>
            </div>
          )}

          {/* Sélection multi-jours */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Jours * <span className="text-gray-400 font-normal">(sélection multiple possible)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {datesInWeek.map(({ iso, label, short }) => (
                  <button key={iso} type="button" onClick={() => toggleDate(iso)}
                    className={`flex flex-col items-center py-2.5 rounded-xl border text-xs font-medium transition
                      ${selectedDates.includes(iso)
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"}`}>
                    <span className="font-bold">{label}</span>
                    <span className={`text-[10px] mt-0.5 ${selectedDates.includes(iso) ? "text-blue-100":"text-gray-400"}`}>
                      {short}
                    </span>
                  </button>
                ))}
              </div>
              {selectedDates.length > 0 && (
                <p className="mt-2 text-xs text-blue-600 font-medium">
                  ✓ {selectedDates.length} jour{selectedDates.length>1?"s":""} sélectionné{selectedDates.length>1?"s":""}
                </p>
              )}
            </div>
          )}

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heure début *</label>
              <select value={form.heure_debut} onChange={e => set("heure_debut",e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">--:--</option>
                {CRENEAUX.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heure fin *</label>
              <select value={form.heure_fin} onChange={e => set("heure_fin",e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">--:--</option>
                {CRENEAUX.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Classe */}
          <Select label="Classe *" value={form.classe_id} onChange={v => set("classe_id",v)}
            options={classes.map(c => ({ value:c.id, label:c.nom }))}
            placeholder="Choisir une classe..."/>

          {/* Semestre */}
          <Select label="Semestre" value={form.semestre_id} onChange={v => set("semestre_id",v)}
            options={semestres.map(s => ({ value:s.id, label:s.libelle }))}
            placeholder="Choisir un semestre..." disabled={!form.classe_id}/>

          {/* Matière */}
          <Select label="Matière" value={form.matiere_id} onChange={v => set("matiere_id",v)}
            options={matieres.map(m => ({ value:m.id, label:`${m.code?"["+m.code+"] ":""}${m.nom}` }))}
            placeholder="Choisir une matière..." disabled={!form.semestre_id}/>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de cours</label>
            <div className="flex gap-2">
              {["CM","TD","TP"].map(t => (
                <button key={t} type="button" onClick={() => set("type_cours",t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition
                    ${form.type_cours===t ? TYPE_COLORS[t].bg+" text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Enseignant */}
          <Select label="Enseignant *" value={form.enseignant_id} onChange={v => set("enseignant_id",v)}
            options={enseignants.map(e => ({ value:e.id, label:`${e.prenom} ${e.nom}${e.specialite?" — "+e.specialite:""}` }))}
            placeholder="Choisir un enseignant..."/>

          {/* Salle */}
          <Select label="Salle *" value={form.salle_id} onChange={v => set("salle_id",v)}
            options={salles.map(s => ({ value:s.id, label:`${s.nom}${s.capacite?" ("+s.capacite+" places)":""}` }))}
            placeholder="Choisir une salle..."/>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            Annuler
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition flex items-center justify-center gap-2">
            {saving ? <><Loader className="h-4 w-4 animate-spin"/> Enregistrement...</> : (isEdit?"Modifier":"Programmer")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function EmploiDuTemps() {
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";
  const isEns   = user.role === "ENSEIGNANT";
  const isEtud  = user.role === "ETUDIANT";

  // Filtres admin : filière → niveau → classe
  const [filieres,    setFilieres]    = useState([]);
  const [filiereId,   setFiliereId]   = useState("");
  const [niveauId,    setNiveauId]    = useState("");
  const [classeId,    setClasseId]    = useState("");

  const [semaines,    setSemaines]    = useState([]);
  const [semaineIdx,  setSemaineIdx]  = useState(0);
  const [seances,     setSeances]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [editSeance,  setEditSeance]  = useState(null);
  const [toast,       setToast]       = useState(null);
  const [showAddSem,  setShowAddSem]  = useState(false);
  const [newSem,      setNewSem]      = useState({ date_debut:"", date_fin:"", semestre_id:"" });
  const [autoClass,   setAutoClass]   = useState(null); // classe auto pour enseignant/étudiant
  const [semestresRef, setSemestresRef] = useState([]); // tous les semestres pour le modal semaine

  const semaine  = semaines[semaineIdx] || null;
  const showToast = (msg, type="success") => setToast({ msg, type });

  // Dériver niveaux et classes disponibles depuis l'arborescence
  const currentFiliere  = filieres.find(f => String(f.id) === String(filiereId));
  const niveauxOptions  = currentFiliere?.niveaux || [];
  const currentNiveau   = niveauxOptions.find(n => String(n.id) === String(niveauId));
  const classesOptions  = currentNiveau?.classes || [];

  // Chargement initial
  useEffect(() => {
    // Toutes les semaines sans filtre
    api.get("/cours/semaines").then(r => { setSemaines(r.data); setSemaineIdx(0); });
    // Tous les semestres pour le modal de création de semaine
    api.get("/cours/semestres").then(r => setSemestresRef(r.data));

    if (isAdmin) {
      // Arborescence filières → niveaux → classes
      api.get("/cours/filieres").then(r => setFilieres(r.data));
    }
    if (isEns) {
      // L'enseignant n'a pas de filtre : ses séances sont chargées auto par le backend
      setAutoClass(null);
    }
    if (isEtud) {
      // Récupérer la classe de l'étudiant pour info
      api.get("/cours/classes").then(r => {
        // Le backend filtre automatiquement par classe_id de l'étudiant
        setAutoClass(null);
      });
    }
  }, [isAdmin, isEns, isEtud]);

  // Reset cascade quand filière change
  useEffect(() => { setNiveauId(""); setClasseId(""); }, [filiereId]);
  useEffect(() => { setClasseId(""); }, [niveauId]);

  // Charger séances
  const loadSeances = useCallback(async () => {
    if (!semaine) { setSeances([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ semaine_id: semaine.id });
      // Admin : filtres optionnels filière/niveau/classe
      if (isAdmin) {
        if (classeId)    params.append("classe_id",   classeId);
        else if (niveauId)   params.append("niveau_id",   niveauId);
        else if (filiereId)  params.append("filiere_id",  filiereId);
      }
      // Pour enseignant et étudiant : le backend filtre automatiquement
      const r = await api.get(`/cours/seances?${params}`);
      setSeances(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [semaine, classeId, niveauId, filiereId, isAdmin]);

  useEffect(() => { loadSeances(); }, [loadSeances]);

  // Répartir par jour de la semaine
  const seancesByDay = {};
  for (let i=0; i<6; i++) seancesByDay[i] = [];
  seances.forEach(s => {
    const d = dayIndex(s.date);
    if (d >= 0 && d < 6) seancesByDay[d].push(s);
  });

  const handleDelete = async id => {
    if (!window.confirm("Supprimer cette séance ?")) return;
    try {
      await api.delete(`/cours/seances/${id}`);
      setSeances(p => p.filter(s => s.id !== id));
      showToast("Séance supprimée.");
    } catch (e) { showToast(e.response?.data?.error || "Erreur","error"); }
  };

  const handleCancel = async seance => {
    if (!window.confirm(`Annuler "${seance.matiere_nom||seance.cours_nom}" ?`)) return;
    try {
      await api.patch(`/cours/seances/${seance.id}`, { statut:"ANNULEE" });
      setSeances(p => p.map(s => s.id===seance.id ? {...s,statut:"ANNULEE"} : s));
      showToast("Cours annulé. Notifications envoyées à l'enseignant et aux étudiants.");
    } catch (e) { showToast(e.response?.data?.error || "Erreur","error"); }
  };

  const handleSaved = (msg) => {
    setShowModal(false); setEditSeance(null);
    loadSeances();
    showToast(msg || "Séance(s) enregistrée(s) avec succès !");
  };

  const addSemaine = async () => {
    if (!newSem.date_debut || !newSem.date_fin || !newSem.semestre_id)
      return showToast("Dates et semestre requis.","error");
    if (newSem.date_fin < newSem.date_debut)
      return showToast("La date de fin doit être après la date de début.","error");
    try {
      const r = await api.post("/cours/semaines", newSem); // semestre_id pas requis
      setSemaines(p => [r.data, ...p]);
      setSemaineIdx(0);
      setShowAddSem(false);
      setNewSem({ date_debut:"", date_fin:"", semestre_id:"" });
      showToast(`Semaine "${semaineLabel(r.data.date_debut)}" créée !`);
    } catch (e) { showToast(e.response?.data?.error || "Erreur","error"); }
  };

  // ── Grille ─────────────────────────────────────────────────────────────────
  const renderGrille = () => (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 min-h-[280px]">
      {JOURS.map((jour, i) => {
        const daySeances = (seancesByDay[i]||[]).sort((a,b) => a.heure_debut.localeCompare(b.heure_debut));
        const start = new Date(semaine.date_debut);
        start.setDate(start.getDate() + i);
        return (
          <div key={i} className="flex flex-col">
            <div className="text-center mb-2 pb-2 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700">{jour}</p>
              <p className="text-[10px] text-gray-400">{fmtShort(start)}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {daySeances.length === 0
                ? <div className="flex items-center justify-center h-12">
                    <div className="w-full border-t border-dashed border-gray-200"/>
                  </div>
                : daySeances.map(s => (
                    <SeanceCard key={s.id} seance={s} isAdmin={isAdmin}
                      onEdit={seq => { setEditSeance(seq); setShowModal(true); }}
                      onDelete={handleDelete} onCancel={handleCancel}/>
                  ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600"/> Emploi du temps
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEtud ? "Vos cours de la semaine" : isEns ? "Vos cours programmés" : "Gérer l'emploi du temps"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowAddSem(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              <Plus className="h-4 w-4"/> Nouvelle semaine
            </button>
            {semaine && (
              <button onClick={() => { setEditSeance(null); setShowModal(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
                <Plus className="h-4 w-4"/> Programmer un cours
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Filtres admin : filière → niveau → classe ───────────────────────── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Filtrer l'affichage
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Filière" value={filiereId} onChange={setFiliereId}
              options={filieres.map(f => ({ value:f.id, label:f.nom }))}
              placeholder="Toutes les filières"/>
            <Select label="Niveau (Licence)" value={niveauId} onChange={setNiveauId}
              options={niveauxOptions.map(n => ({ value:n.id, label:n.nom }))}
              placeholder="Tous les niveaux" disabled={!filiereId}/>
            <Select label="Classe" value={classeId} onChange={setClasseId}
              options={classesOptions.map(c => ({ value:c.id, label:c.nom }))}
              placeholder="Toutes les classes" disabled={!niveauId}/>
          </div>
          {(filiereId||niveauId||classeId) && (
            <button onClick={() => { setFiliereId(""); setNiveauId(""); setClasseId(""); }}
              className="mt-2 text-xs text-blue-600 hover:underline">
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* ── Emploi du temps ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        {semaines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Calendar className="h-12 w-12 text-gray-200 mb-3"/>
            <p className="text-gray-500 font-medium">Aucune semaine disponible</p>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin ? "Créez une semaine pour commencer à programmer des cours."
                       : "L'emploi du temps n'est pas encore disponible."}
            </p>
          </div>
        ) : (
          <>
            {/* Navigation semaine */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setSemaineIdx(i => Math.min(i+1, semaines.length-1))}
                disabled={semaineIdx >= semaines.length-1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition">
                <ChevronLeft className="h-4 w-4 text-gray-600"/>
              </button>
              <div className="text-center">
                {/* "Semaine du 16 mars 2026" */}
                <p className="font-semibold text-gray-900 text-sm">
                  {semaineLabel(semaine.date_debut)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(semaine.date_debut).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
                  {" → "}
                  {new Date(semaine.date_fin).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
                </p>
                <p className="text-[10px] text-gray-300 mt-0.5">
                  {semaineIdx+1} / {semaines.length}
                </p>
              </div>
              <button onClick={() => setSemaineIdx(i => Math.max(i-1, 0))}
                disabled={semaineIdx === 0}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition">
                <ChevronRight className="h-4 w-4 text-gray-600"/>
              </button>
            </div>

            {loading
              ? <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
              : seances.length === 0
              ? <div className="flex flex-col items-center py-12 text-center">
                  <Calendar className="h-10 w-10 text-gray-200 mb-2"/>
                  <p className="text-gray-400 text-sm">Aucun cours cette semaine</p>
                  {isAdmin && (
                    <button onClick={() => { setEditSeance(null); setShowModal(true); }}
                      className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5"/> Programmer un cours
                    </button>
                  )}
                </div>
              : renderGrille()
            }

            {/* Légende */}
            {seances.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100">
                {Object.entries(TYPE_COLORS).map(([k,v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${v.bg}`}/>
                    <span className="text-xs text-gray-500">{k}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-300"/>
                  <span className="text-xs text-gray-500">Annulé</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal créer semaine ──────────────────────────────────────────────── */}
      {showAddSem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Créer une semaine</h3>
              <button onClick={() => setShowAddSem(false)}><X className="h-5 w-5 text-gray-400"/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
                <input type="date" value={newSem.date_debut}
                  onChange={e => setNewSem(f => ({...f, date_debut:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin *</label>
                <input type="date" value={newSem.date_fin}
                  onChange={e => setNewSem(f => ({...f, date_fin:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
              </div>
              {/* Prévisualisation du nom */}
              {/* Semestre */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Semestre *</label>
                <select value={newSem.semestre_id}
                  onChange={e => setNewSem(f => ({...f, semestre_id: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Choisir un semestre...</option>
                  {semestresRef.map(s => (
                    <option key={s.id} value={s.id}>{s.libelle}</option>
                  ))}
                </select>
              </div>
              {/* Prévisualisation */}
              {newSem.date_debut && (
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">Nom de la semaine</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {semaineLabel(newSem.date_debut)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddSem(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={addSemaine}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal séance ──────────────────────────────────────────────────────── */}
      {showModal && semaine && (
        <ModalSeance semaine={semaine} data={editSeance}
          onClose={() => { setShowModal(false); setEditSeance(null); }}
          onSaved={handleSaved}/>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  );
}