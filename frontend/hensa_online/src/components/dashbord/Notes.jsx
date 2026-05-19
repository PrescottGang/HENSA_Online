// src/components/dashbord/Notes.jsx
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Save, Loader, AlertCircle, Check,
  ChevronDown, ChevronRight, Search, Users, X,
  GraduationCap, FileText, RotateCcw, Building,
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

const fullUrl  = url => !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;
const getInit  = (p="",n="") => `${p[0]??""}${n[0]??""}`.toUpperCase();

// ✅ Clamp strict 0–20
const clamp = v =>
  v === null || v === undefined || v === "" ? null
  : Math.min(20, Math.max(0, parseFloat(v)));

const mention = m =>
  m === null ? null
  : m >= 16 ? "Très bien" : m >= 14 ? "Bien"
  : m >= 12 ? "Assez bien" : m >= 10 ? "Passable" : "Insuffisant";

const mentionBadge = m =>
  m === null ? "" : "px-2 py-0.5 rounded-full text-[10px] font-bold " +
  (m>=16?"bg-blue-100 text-blue-700":m>=14?"bg-green-100 text-green-700":
   m>=12?"bg-yellow-100 text-yellow-700":m>=10?"bg-orange-100 text-orange-700":"bg-red-100 text-red-700");

// Calcul moyenne finale tenant compte du rattrapage
const calcMoyFinale = (cc, ef, ratt) => {
  const moy = cc != null && ef != null
    ? Math.round((cc * 0.4 + ef * 0.6) * 100) / 100
    : null;
  if (ratt != null) {
    // Admis via rattrapage : note finale plafonnée à 10
    if (ratt >= 10) return 10;
    // Rattrapage inférieur à 10 : on garde le meilleur entre rattrapage et moy initiale
    return Math.round(Math.max(ratt, moy ?? 0) * 100) / 100;
  }
  return moy;
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS PARTAGÉS
// ══════════════════════════════════════════════════════════════════════════════

function Select({ label, value, onChange, options, placeholder="Sélectionner...", disabled=false }) {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => String(o.value) === String(value));
  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <button type="button" disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left transition
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                     : "bg-white border-gray-200 hover:border-blue-400"}`}>
        <span className={`truncate pr-2 ${sel ? "text-gray-800" : "text-gray-400"}`}>{sel?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-56 overflow-y-auto">
          {options.length === 0
            ? <p className="p-3 text-sm text-gray-400 text-center">Aucune option</p>
            : options.map(o => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition
                  ${String(o.value) === String(value) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-800"}`}>
                {o.label}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function Avatar({ etud }) {
  const [err, setErr] = useState(false);
  const photo = fullUrl(etud?.photo_profil);
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
      {photo && !err
        ? <img src={photo} alt="" className="w-full h-full object-cover" onError={() => setErr(true)}/>
        : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {getInit(etud?.prenom, etud?.nom)}
          </div>
      }
    </div>
  );
}

// ✅ Champ note : clamp 0-20 en temps réel + couleur selon valeur
function NoteInput({ value, onChange, readOnly = false, placeholder = "—" }) {
  const num = value !== null && value !== "" ? parseFloat(value) : null;
  const border = num === null ? "border-gray-200 bg-white"
               : num >= 10  ? "border-green-300 bg-green-50"
               :               "border-red-300 bg-red-50";
  const handleChange = e => {
    if (!onChange) return;
    if (e.target.value === "") { onChange(null); return; }
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) return;
    onChange(Math.min(20, Math.max(0, raw)));   // ✅ clamp immédiat
  };
  return (
    <input type="number" min="0" max="20" step="0.25"
      value={value ?? ""} readOnly={readOnly} placeholder={placeholder}
      onChange={handleChange}
      className={`w-16 text-center py-1.5 rounded-lg border text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-300 transition
        ${readOnly ? "cursor-default" : ""} ${border}`}
    />
  );
}

function Statistiques({ etudiants, getNote }) {
  const moyennes = etudiants.map(e => getNote(e.id)).filter(m => m !== null);
  if (!moyennes.length) return null;
  const avg  = Math.round(moyennes.reduce((a,b)=>a+b,0)/moyennes.length*100)/100;
  const max  = Math.max(...moyennes);
  const min  = Math.min(...moyennes);
  const pass = moyennes.filter(m=>m>=10).length;
  const rate = Math.round(pass/moyennes.length*100);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[
        { label:"Moyenne générale",  value:`${avg}/20`,              color:"text-blue-600"  },
        { label:"Meilleure note",    value:`${max}/20`,              color:"text-green-600" },
        { label:"Note la plus basse",value:`${min}/20`,              color:"text-red-500"   },
        { label:"Reçus (≥10)",       value:`${pass}/${moyennes.length}`, color:"text-green-600" },
        { label:"Taux de réussite",  value:`${rate}%`,               color:rate>=50?"text-green-600":"text-red-500" },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-[10px] text-gray-400 mb-1">{label}</p>
          <p className={`text-base font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type === "success" ? "bg-green-600" : "bg-red-600"}`}>
      {type === "success" ? <Check className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
      {msg}
      <button onClick={onClose}><X className="h-3.5 w-3.5 ml-1"/></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE ENSEIGNANT — saisie CC + EF + rattrapage
// ══════════════════════════════════════════════════════════════════════════════
function VueEnseignant() {
  const [mesMatieres, setMesMatieres] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [etudiants,   setEtudiants]   = useState([]);
  const [edits,       setEdits]       = useState({});
  const [anneeId,       setAnneeId]       = useState(null);
  const [selSemestreId, setSelSemestreId] = useState(null); // résolu par le backend
  const [loading,       setLoading]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [dirty,       setDirty]       = useState(false);
  const [search,      setSearch]      = useState("");
  const [toast,       setToast]       = useState(null);
  const showToast = (msg, type="success") => setToast({ msg, type });

  useEffect(() => {
    api.get("/cours/mes-matieres").then(r => {
      setMesMatieres(r.data);
      if (r.data.length === 1) {
        const m = r.data[0];
        setSelectedKey(`${m.matiere_id}_${m.classe_id}_${m.semestre_id}`);
      }
    }).catch(console.error);
  }, []);

  const selMat = mesMatieres.find(m =>
    `${m.matiere_id}_${m.classe_id}_${m.semestre_id}` === selectedKey
  );

  useEffect(() => {
    if (!selMat) { setEtudiants([]); setEdits({}); setSelSemestreId(null); return; }
    setLoading(true);
    // ✅ semestre_id non envoyé — le backend le déduit depuis UE → semestre
    api.get(`/cours/notes?matiere_id=${selMat.matiere_id}&classe_id=${selMat.classe_id}`)
      .then(r => {
        setEtudiants(r.data.etudiants || []);
        setAnneeId(r.data.annee_id);
        if (r.data.semestre_id) setSelSemestreId(r.data.semestre_id);
        const init = {};
        (r.data.etudiants || []).forEach(e => {
          init[e.id] = { cc: e.cc, ef: e.ef, rattrapage: e.rattrapage ?? null };
        });
        setEdits(init);
        setDirty(false);
      }).catch(console.error).finally(() => setLoading(false));
  }, [selectedKey]);

  const setNote = (id, field, val) => {
    setEdits(p => ({ ...p, [id]: { ...p[id], [field]: clamp(val) } }));
    setDirty(true);
  };
  const getMoy = id => {
    const { cc, ef } = edits[id] || {};
    return cc != null && ef != null ? Math.round((cc*0.4+ef*0.6)*100)/100 : null;
  };
  const needsRatt = id => { const m = getMoy(id); return m !== null && m < 10; };

  const save = async () => {
    if (!selMat || !anneeId) return;
    setSaving(true);
    try {
      // ✅ Semestre résolu par le backend, pas depuis semaine
      const semestreId = selSemestreId || selMat.semestre_id;
      if (!semestreId) { showToast("Semestre introuvable pour cette matière.", "error"); setSaving(false); return; }

      const notes = etudiants.map(e => ({
        etudiant_id: e.id,
        matiere_id:  selMat.matiere_id,
        semestre_id: semestreId,
        annee_id:    anneeId,
        cc: edits[e.id]?.cc ?? null,
        ef: edits[e.id]?.ef ?? null,
      }));
      await api.post("/cours/notes", { notes });

      // ✅ Sauvegarder rattrapage si saisi
      const rattNotes = etudiants
        .filter(e => edits[e.id]?.rattrapage != null)
        .map(e => ({
          etudiant_id: e.id,
          matiere_id:  selMat.matiere_id,
          semestre_id: semestreId,
          annee_id:    anneeId,
          rattrapage:  edits[e.id].rattrapage,
        }));
      if (rattNotes.length) await api.post("/cours/notes/rattrapage", { notes: rattNotes });

      setDirty(false);
      showToast(`${notes.length} note(s) enregistrée(s) !`);
    } catch (e) { showToast(e.response?.data?.error || "Erreur", "error"); }
    finally { setSaving(false); }
  };

  const filtered = etudiants.filter(e =>
    `${e.prenom} ${e.nom} ${e.matricule || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const matiereOptions = mesMatieres.map(m => ({
    value: `${m.matiere_id}_${m.classe_id}_${m.semestre_id}`,
    label: `${m.matiere_nom} — ${m.classe_nom} (${m.semestre_libelle || "Sem. ?"})`,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        {mesMatieres.length === 0 ? (
          <div className="flex items-center gap-3 bg-amber-50 text-amber-700 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0"/>
            <p className="text-sm">Aucune matière assignée. Des séances avec matière doivent être programmées.</p>
          </div>
        ) : (
          <Select label="Sélectionner la matière et la classe" value={selectedKey}
            onChange={setSelectedKey} options={matiereOptions} placeholder="Choisir une matière..."/>
        )}
      </div>

      {selMat && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[["Matière",selMat.matiere_nom],["Classe",selMat.classe_nom],
            ["Semestre",selMat.semestre_libelle||"—"],["Année",selMat.annee_libelle||"—"]].map(([l,v])=>(
            <div key={l} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{l}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{v}</p>
            </div>
          ))}
        </div>
      )}

      {selMat && etudiants.length > 0 && <Statistiques etudiants={etudiants} getNote={getMoy}/>}

      {selMat && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4"/> {etudiants.length} étudiant{etudiants.length>1?"s":""}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            </div>
            <span className="hidden sm:block text-xs text-gray-400">CC 40% + EF 60%</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
          ) : etudiants.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Users className="h-10 w-10 text-gray-200 mb-3"/>
              <p className="text-gray-500">Aucun étudiant dans cette classe</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Étudiant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Matricule</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">CC /20</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">EF /20</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Moy.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-orange-500 uppercase">Ratt.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Finale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((etud, i) => {
                    const moy  = getMoy(etud.id);
                    const ratt = edits[etud.id]?.rattrapage ?? null;
                    const mf   = calcMoyFinale(edits[etud.id]?.cc, edits[etud.id]?.ef, ratt);
                    return (
                      <tr key={etud.id}
                        className={`${i%2===0?"bg-white":"bg-gray-50/30"}
                          ${needsRatt(etud.id) ? "border-l-2 border-orange-300" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar etud={etud}/>
                            <p className="text-sm font-semibold text-gray-900">{etud.prenom} {etud.nom}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-400 font-mono">{etud.matricule||"—"}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <NoteInput value={edits[etud.id]?.cc ?? null} onChange={v => setNote(etud.id,"cc",v)}/>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <NoteInput value={edits[etud.id]?.ef ?? null} onChange={v => setNote(etud.id,"ef",v)}/>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {moy !== null
                            ? <span className={`text-sm font-bold ${moy>=10?"text-green-600":"text-red-500"}`}>{moy}/20</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        {/* ✅ Colonne rattrapage — visible si moy < 10 ou déjà saisi */}
                        <td className="px-3 py-3 text-center">
                          {(needsRatt(etud.id) || ratt !== null) ? (
                            <NoteInput value={ratt} placeholder="Ratt."
                              onChange={v => setNote(etud.id,"rattrapage",v)}/>
                          ) : (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          {mf !== null
                            ? <span className={`text-sm font-bold ${mf>=10?"text-green-600":"text-red-500"}`}>{mf}/20</span>
                            : <span className="text-gray-200">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Moy = CC×40% + EF×60% · Rattrapage disponible si moy &lt; 10 · Notes entre 0 et 20
            </p>
            <button onClick={save} disabled={saving || !dirty}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition
                ${dirty ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
              {saving
                ? <><Loader className="h-4 w-4 animate-spin"/> Enregistrement...</>
                : <><Save className="h-4 w-4"/> {dirty ? "Enregistrer" : "Sauvegardé"}</>}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE ÉTUDIANT — consultation des notes + rattrapage
// ══════════════════════════════════════════════════════════════════════════════
function VueEtudiant() {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/cours/notes/etudiant").then(r => setNotes(r.data)).finally(() => setLoading(false));
  }, []);

  const bySemestre = {};
  notes.forEach(n => {
    const k = n.semestre_libelle || `Semestre ${n.numero}`;
    if (!bySemestre[k]) bySemestre[k] = [];
    bySemestre[k].push(n);
  });

  const moyennes = notes.map(n => n.moyenne_finale ?? n.moyenne).filter(m => m !== null);
  const moyGen   = moyennes.length ? Math.round(moyennes.reduce((a,b)=>a+b,0)/moyennes.length*100)/100 : null;

  if (loading) return <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>;

  return (
    <div className="space-y-4">
      {moyGen !== null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Moyenne générale</p>
            <p className={`text-2xl font-bold ${moyGen>=10?"text-green-600":"text-red-500"}`}>{moyGen}/20</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Matières évaluées</p>
            <p className="text-2xl font-bold text-gray-800">{notes.filter(n=>n.moyenne!==null).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Mention générale</p>
            <p className={`text-sm font-bold ${moyGen>=10?"text-green-600":"text-red-500"}`}>{mention(moyGen)||"—"}</p>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
          <FileText className="h-12 w-12 text-gray-200 mb-3"/>
          <p className="text-gray-500 font-medium">Aucune note disponible</p>
          <p className="text-sm text-gray-400 mt-1">Vos notes apparaîtront ici une fois saisies par vos enseignants.</p>
        </div>
      ) : Object.entries(bySemestre).map(([sem, semNotes]) => {
        const smoys = semNotes.map(n => n.moyenne_finale ?? n.moyenne).filter(m => m !== null);
        const smoyG = smoys.length ? Math.round(smoys.reduce((a,b)=>a+b,0)/smoys.length*100)/100 : null;
        return (
          <div key={sem} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">{sem}</h3>
              {smoyG !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Moy. semestre :</span>
                  <span className={`text-sm font-bold ${smoyG>=10?"text-green-600":"text-red-500"}`}>{smoyG}/20</span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Matière</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">UE</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">CC</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">EF</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Moy.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-orange-500 uppercase">Ratt.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Mention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {semNotes.map(n => {
                    const mf = n.moyenne_finale ?? calcMoyFinale(n.cc, n.ef, n.rattrapage);
                    return (
                      <tr key={n.id} className="hover:bg-blue-50/20 transition">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-800">{n.matiere_nom}</p>
                          {n.matiere_code && <p className="text-[10px] text-gray-400 font-mono">{n.matiere_code}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">{n.ue_nom}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-medium ${n.cc!=null?(n.cc>=10?"text-green-600":"text-red-500"):"text-gray-300"}`}>
                            {n.cc != null ? `${n.cc}/20` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-medium ${n.ef!=null?(n.ef>=10?"text-green-600":"text-red-500"):"text-gray-300"}`}>
                            {n.ef != null ? `${n.ef}/20` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {n.moyenne != null
                            ? <span className={`text-sm font-bold ${n.moyenne>=10?"text-green-600":"text-red-500"}`}>{n.moyenne}/20</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {n.rattrapage != null
                            ? <span className={`text-sm font-bold ${n.rattrapage>=10?"text-green-600":"text-orange-500"}`}>
                                {n.rattrapage}/20
                              </span>
                            : n.moyenne != null && n.moyenne < 10
                              ? <span className="text-xs text-orange-400 font-medium">En attente</span>
                              : <span className="text-gray-200">—</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          {mf != null && <span className={mentionBadge(mf)}>{mention(mf)}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE ADMIN — navigation filière → niveau → classe → étudiants + rattrapage
// ══════════════════════════════════════════════════════════════════════════════
function VueAdmin() {
  const [filieres,  setFilieres]  = useState([]);
  const [filiereId, setFiliereId] = useState("");
  const [niveauId,  setNiveauId]  = useState("");
  const [classeId,  setClasseId]  = useState("");
  const [data,      setData]      = useState(null);   // { annee, rows }
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [openId,    setOpenId]    = useState(null);   // `${classeId}-${etudiantId}`

  // Arborescence filières
  useEffect(() => {
    api.get("/cours/filieres").then(r => setFilieres(r.data)).catch(console.error);
  }, []);

  const curFiliere = filieres.find(f => String(f.id) === String(filiereId));
  const niveaux    = curFiliere?.niveaux || [];
  const curNiveau  = niveaux.find(n => String(n.id) === String(niveauId));
  const classes    = curNiveau?.classes || [];

  // Reset cascade
  useEffect(() => { setNiveauId(""); setClasseId(""); setData(null); }, [filiereId]);
  useEffect(() => { setClasseId(""); setData(null); }, [niveauId]);

  const loadNotes = useCallback(async () => {
    if (!filiereId) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ filiere_id: filiereId });
      if (niveauId) p.append("niveau_id", niveauId);
      if (classeId) p.append("classe_id", classeId);
      const r = await api.get(`/cours/notes/par-filiere?${p}`);
      setData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filiereId, niveauId, classeId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // ── Construire arbre filière → niveau → classe → étudiant ──────────────────
  const tree = {};
  (data?.rows || []).forEach(row => {
    const { filiere_id, filiere_nom, niveau_id, niveau_nom, niveau_ordre,
            classe_id, classe_nom, etudiant_id } = row;

    if (!tree[filiere_id])
      tree[filiere_id] = { id: filiere_id, nom: filiere_nom, niveaux: {} };

    const f = tree[filiere_id];
    if (!f.niveaux[niveau_id])
      f.niveaux[niveau_id] = { id: niveau_id, nom: niveau_nom, ordre: niveau_ordre, classes: {} };

    const nv = f.niveaux[niveau_id];
    if (!nv.classes[classe_id])
      nv.classes[classe_id] = { id: classe_id, nom: classe_nom, etudiants: {} };

    const cl = nv.classes[classe_id];
    if (!cl.etudiants[etudiant_id])
      cl.etudiants[etudiant_id] = {
        id: etudiant_id, prenom: row.prenom, nom: row.nom,
        photo_profil: row.photo_profil, matricule: row.matricule,
        notes: [],
      };

    if (row.note_id) {
      cl.etudiants[etudiant_id].notes.push({
        matiere_nom: row.matiere_nom, matiere_code: row.matiere_code,
        ue_nom: row.ue_nom, coefficient: row.coefficient,
        semestre_libelle: row.semestre_libelle,
        cc: row.cc, ef: row.ef, rattrapage: row.rattrapage,
        moyenne: row.moyenne, moyenne_finale: row.moyenne_finale,
      });
    }
  });

  const getMoyGen = etud => {
    const ms = etud.notes.map(n => n.moyenne_finale).filter(m => m !== null);
    return ms.length ? Math.round(ms.reduce((a,b)=>a+b,0)/ms.length*100)/100 : null;
  };

  const matchSearch = etud =>
    `${etud.prenom} ${etud.nom} ${etud.matricule||""}`.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="space-y-4">
      {/* ── Filtres ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtrer par</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Filière *" value={filiereId} onChange={setFiliereId}
            options={filieres.map(f => ({ value: f.id, label: f.nom }))}
            placeholder="Choisir une filière..."/>
          <Select label="Niveau" value={niveauId} onChange={setNiveauId}
            options={niveaux.map(n => ({ value: n.id, label: n.nom }))}
            placeholder="Tous les niveaux" disabled={!filiereId}/>
          <Select label="Classe" value={classeId} onChange={setClasseId}
            options={classes.map(c => ({ value: c.id, label: c.nom }))}
            placeholder="Toutes les classes" disabled={!niveauId}/>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input type="text" placeholder="Rechercher un étudiant..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
          </div>
          {(filiereId || search) && (
            <button onClick={() => { setFiliereId(""); setSearch(""); setData(null); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition">
              <RotateCcw className="h-3.5 w-3.5"/> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── Contenu ──────────────────────────────────────────────────────────── */}
      {!filiereId ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
          <Building className="h-12 w-12 text-gray-200 mb-3"/>
          <p className="text-gray-500 font-medium">Sélectionnez une filière</p>
          <p className="text-sm text-gray-400 mt-1">pour consulter les notes des étudiants</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
      ) : (
        <div className="space-y-4">
          {/* Année académique */}
          {data?.annee && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5"/>
              Année académique active : <span className="font-semibold text-gray-700">{data.annee.libelle}</span>
            </p>
          )}

          {Object.values(tree).map(filiere => (
            <div key={filiere.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

              {/* Header filière */}
              <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
                <Building className="h-5 w-5 opacity-80"/>
                <h2 className="font-bold text-base">{filiere.nom}</h2>
              </div>

              {Object.values(filiere.niveaux).sort((a,b) => a.ordre - b.ordre).map(niveau => (
                <div key={niveau.id} className="border-t border-gray-100">

                  {/* Header niveau */}
                  <div className="flex items-center gap-2 px-5 py-3 bg-blue-50/60 border-b border-blue-100">
                    <GraduationCap className="h-4 w-4 text-blue-600"/>
                    <h3 className="font-semibold text-gray-800 text-sm">{niveau.nom}</h3>
                  </div>

                  {Object.values(niveau.classes).map(classe => {
                    const allEtuds = Object.values(classe.etudiants).filter(matchSearch);
                    const recus    = allEtuds.filter(e => { const m = getMoyGen(e); return m !== null && m >= 10; }).length;
                    const echecs   = allEtuds.length - recus;

                    return (
                      <div key={classe.id} className="border-t border-gray-100">

                        {/* Header classe */}
                        <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50/70">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400"/>
                            <span className="text-sm font-medium text-gray-700">{classe.nom}</span>
                            <span className="text-xs text-gray-400">
                              ({allEtuds.length} étudiant{allEtuds.length>1?"s":""})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="text-green-600">{recus} reçu{recus>1?"s":""}</span>
                            <span className="text-red-500">{echecs} échec{echecs>1?"s":""}</span>
                          </div>
                        </div>

                        {/* Liste étudiants */}
                        {allEtuds.length === 0 ? (
                          <p className="px-5 py-4 text-sm text-gray-400 text-center">Aucun étudiant trouvé</p>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {allEtuds.map(etud => {
                              const moyG    = getMoyGen(etud);
                              const key     = `${classe.id}-${etud.id}`;
                              const isOpen  = openId === key;
                              const hasRatt = etud.notes.some(n => n.rattrapage != null);
                              const needRatt = moyG !== null && moyG < 10 && !hasRatt;

                              return (
                                <div key={etud.id}>
                                  {/* Ligne étudiant cliquable */}
                                  <button
                                    onClick={() => setOpenId(isOpen ? null : key)}
                                    className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition text-left
                                      ${needRatt ? "border-l-4 border-orange-400" : ""}
                                      ${hasRatt  ? "border-l-4 border-green-400"  : ""}`}>
                                    <Avatar etud={etud}/>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900">{etud.prenom} {etud.nom}</p>
                                      <p className="text-xs text-gray-400 font-mono">{etud.matricule||"—"}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {/* ✅ Badge état rattrapage */}
                                      {needRatt && (
                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                          Rattrapage
                                        </span>
                                      )}
                                      {hasRatt && (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                          Ratt. effectué
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-400 hidden sm:block">
                                        {etud.notes.length} mat.
                                      </span>
                                      {moyG !== null && (
                                        <span className={`text-sm font-bold ${moyG>=10?"text-green-600":"text-red-500"}`}>
                                          {moyG}/20
                                        </span>
                                      )}
                                      {moyG !== null && (
                                        <span className={mentionBadge(moyG)}>{mention(moyG)}</span>
                                      )}
                                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isOpen?"rotate-90":""}`}/>
                                    </div>
                                  </button>

                                  {/* ✅ Détail notes accordéon */}
                                  {isOpen && (
                                    <div className="px-5 pb-5 bg-gray-50/40">
                                      {etud.notes.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4">Aucune note enregistrée</p>
                                      ) : (
                                        <div className="overflow-x-auto mt-2">
                                          <table className="w-full text-sm rounded-xl overflow-hidden border border-gray-200">
                                            <thead>
                                              <tr className="bg-gray-100 text-xs text-gray-500 uppercase">
                                                <th className="text-left px-4 py-2.5">Matière</th>
                                                <th className="text-left px-3 py-2.5 hidden sm:table-cell">Semestre</th>
                                                <th className="text-center px-3 py-2.5">CC</th>
                                                <th className="text-center px-3 py-2.5">EF</th>
                                                <th className="text-center px-3 py-2.5">Moy.</th>
                                                <th className="text-center px-3 py-2.5 text-orange-500">Ratt.</th>
                                                <th className="text-center px-3 py-2.5">Finale</th>
                                                <th className="text-center px-3 py-2.5 hidden sm:table-cell">Mention</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                              {etud.notes.map((n, i) => {
                                                const mf = n.moyenne_finale ??
                                                  calcMoyFinale(n.cc, n.ef, n.rattrapage);
                                                return (
                                                  <tr key={i} className={n.rattrapage!=null?"bg-green-50/40":""}>
                                                    <td className="px-4 py-2.5">
                                                      <p className="font-medium text-gray-800">{n.matiere_nom}</p>
                                                      {n.matiere_code && (
                                                        <p className="text-[10px] text-gray-400 font-mono">{n.matiere_code}</p>
                                                      )}
                                                    </td>
                                                    <td className="px-3 py-2.5 hidden sm:table-cell">
                                                      <span className="text-xs text-gray-500">{n.semestre_libelle||"—"}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center text-gray-600">
                                                      {n.cc != null ? n.cc : "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center text-gray-600">
                                                      {n.ef != null ? n.ef : "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                      {n.moyenne != null
                                                        ? <span className={`font-bold ${n.moyenne>=10?"text-green-600":"text-red-500"}`}>
                                                            {n.moyenne}
                                                          </span>
                                                        : "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                      {n.rattrapage != null
                                                        ? <span className={`font-bold ${n.rattrapage>=10?"text-green-600":"text-orange-500"}`}>
                                                            {n.rattrapage}
                                                          </span>
                                                        : n.moyenne!=null&&n.moyenne<10
                                                          ? <span className="text-orange-300 text-xs">—</span>
                                                          : <span className="text-gray-300">—</span>
                                                      }
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                      {mf != null
                                                        ? <span className={`font-bold ${mf>=10?"text-green-700":"text-red-600"}`}>
                                                            {mf}
                                                          </span>
                                                        : "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                                                      {mf != null && (
                                                        <span className={mentionBadge(mf)}>{mention(mf)}</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {data && Object.keys(tree).length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
              <FileText className="h-12 w-12 text-gray-200 mb-3"/>
              <p className="text-gray-500 font-medium">Aucun étudiant trouvé</p>
              <p className="text-sm text-gray-400 mt-1">Aucun étudiant inscrit pour ces critères.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Notes() {
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";
  const isEns   = user.role === "ENSEIGNANT";
  const isEtud  = user.role === "ETUDIANT";

  const subtitle = isAdmin ? "Consulter les notes par filière, niveau et classe"
                 : isEns   ? "Saisir les notes CC, EF et rattrapage de vos étudiants"
                 :            "Consulter vos notes et résultats";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600"/> Notes & Évaluations
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {isEns   && <VueEnseignant/>}
      {isEtud  && <VueEtudiant/>}
      {isAdmin && <VueAdmin/>}
    </div>
  );
}