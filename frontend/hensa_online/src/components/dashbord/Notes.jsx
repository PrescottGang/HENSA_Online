// src/components/dashbord/Notes.jsx
import { useState, useEffect } from "react";
import {
  BookOpen, Save, Loader, AlertCircle, Check,
  ChevronDown, Search, Users, X, Award
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
const getInit  = (p="",n="") => `${p[0]??""} ${n[0]??""}`.toUpperCase().trim();
const mention  = m => m === null ? null : m >= 16 ? "Très bien" : m >= 14 ? "Bien" : m >= 12 ? "Assez bien" : m >= 10 ? "Passable" : "Insuffisant";
const mentionColor = m => m === null ? "" : m >= 16 ? "text-blue-600" : m >= 14 ? "text-green-600" : m >= 12 ? "text-yellow-600" : m >= 10 ? "text-orange-500" : "text-red-500";

// ─── Sélecteur ─────────────────────────────────────────────────────────────
function Select({ label, value, onChange, options, placeholder = "Sélectionner...", disabled = false }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => String(o.value) === String(value));
  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <button type="button" disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left transition
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                     : "bg-white border-gray-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-200"}`}>
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180":""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-52 overflow-y-auto">
          {options.length === 0
            ? <p className="p-3 text-sm text-gray-400 text-center">Aucune option</p>
            : options.map(o => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition
                  ${String(o.value)===String(value) ? "bg-blue-50 text-blue-700 font-medium":"text-gray-800"}`}>
                {o.label}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Avatar étudiant ────────────────────────────────────────────────────────
function EtudAvatar({ etud, size = "md" }) {
  const [err, setErr] = useState(false);
  const s = { sm:"w-8 h-8 text-[10px]", md:"w-10 h-10 text-xs" }[size];
  const photo = fullUrl(etud?.photo_profil);
  return (
    <div className={`${s} rounded-full overflow-hidden flex-shrink-0`}>
      {photo && !err
        ? <img src={photo} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />
        : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {getInit(etud?.prenom, etud?.nom)}
          </div>
      }
    </div>
  );
}

// ─── Champ note ─────────────────────────────────────────────────────────────
function NoteInput({ value, onChange, label }) {
  const num = value !== null && value !== "" ? parseFloat(value) : null;
  const color = num === null ? "border-gray-200" : num >= 10 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-gray-500">{label}</span>
      <input
        type="number" min="0" max="20" step="0.25"
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
        placeholder="—"
        className={`w-16 text-center py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition ${color}`}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Notes() {
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";

  // Sélection matière/classe
  const [mesMatieres,  setMesMatieres]  = useState([]); // [{matiere_id, matiere_nom, classe_id, classe_nom, semestre_id, annee_id}]
  const [selectedKey,  setSelectedKey]  = useState(""); // "matiereId_classeId_semestreId"
  const [etudiants,    setEtudiants]    = useState([]);
  const [edits,        setEdits]        = useState({}); // { etudiantId: { cc, ef } }
  const [anneeId,      setAnneeId]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [dirty,        setDirty]        = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Charger les matières de l'enseignant
  useEffect(() => {
    api.get("/cours/mes-matieres")
      .then(r => {
        setMesMatieres(r.data);
        if (r.data.length === 1) {
          const m = r.data[0];
          setSelectedKey(`${m.matiere_id}_${m.classe_id}_${m.semestre_id}`);
        }
      })
      .catch(console.error);
  }, []);

  // Déduire matiere/classe/semestre depuis selectedKey
  const selectedMat = mesMatieres.find(m =>
    `${m.matiere_id}_${m.classe_id}_${m.semestre_id}` === selectedKey
  );

  // Charger les étudiants + notes
  useEffect(() => {
    if (!selectedMat) { setEtudiants([]); setEdits({}); return; }
    setLoading(true);
    api.get(`/cours/notes?matiere_id=${selectedMat.matiere_id}&classe_id=${selectedMat.classe_id}&semestre_id=${selectedMat.semestre_id}`)
      .then(r => {
        setEtudiants(r.data.etudiants || []);
        setAnneeId(r.data.annee_id);
        // Initialiser edits depuis DB
        const init = {};
        (r.data.etudiants || []).forEach(e => {
          init[e.id] = { cc: e.cc, ef: e.ef };
        });
        setEdits(init);
        setDirty(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedKey]);

  const setNote = (etudId, field, val) => {
    setEdits(p => ({ ...p, [etudId]: { ...p[etudId], [field]: val } }));
    setDirty(true);
  };

  const calcMoyenne = (etudId) => {
    const { cc, ef } = edits[etudId] || {};
    if (cc !== null && cc !== undefined && ef !== null && ef !== undefined)
      return Math.round((cc * 0.4 + ef * 0.6) * 100) / 100;
    return null;
  };

  // Sauvegarder toutes les notes
  const save = async () => {
    if (!selectedMat || !anneeId) return;
    setSaving(true);
    try {
      const notes = etudiants.map(e => ({
        etudiant_id: e.id,
        matiere_id:  selectedMat.matiere_id,
        semestre_id: selectedMat.semestre_id,
        annee_id:    anneeId,
        cc:          edits[e.id]?.cc  ?? null,
        ef:          edits[e.id]?.ef  ?? null,
      }));
      await api.post("/cours/notes", { notes });
      setDirty(false);
      showToast(`${notes.length} note(s) enregistrée(s) avec succès !`);
    } catch (e) {
      showToast(e.response?.data?.error || "Erreur lors de l'enregistrement.", "error");
    } finally { setSaving(false); }
  };

  // Statistiques
  const stats = (() => {
    const moyennes = etudiants.map(e => calcMoyenne(e.id)).filter(m => m !== null);
    if (!moyennes.length) return null;
    const avg  = Math.round(moyennes.reduce((a,b) => a+b, 0) / moyennes.length * 100) / 100;
    const max  = Math.max(...moyennes);
    const min  = Math.min(...moyennes);
    const pass = moyennes.filter(m => m >= 10).length;
    return { avg, max, min, pass, total: moyennes.length };
  })();

  const filtered = etudiants.filter(e =>
    `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(search.toLowerCase())
  );

  // Options du sélecteur de matières
  const matiereOptions = mesMatieres.map(m => ({
    value: `${m.matiere_id}_${m.classe_id}_${m.semestre_id}`,
    label: `${m.matiere_nom} — ${m.classe_nom} (${m.semestre_libelle})`,
  }));

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" /> Notes & Évaluations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Saisissez les notes CC et EF de vos étudiants
          </p>
        </div>
        {dirty && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition">
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Enregistrement..." : "Enregistrer les notes"}
          </button>
        )}
      </div>

      {/* ── Sélection matière ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        {mesMatieres.length === 0 ? (
          <div className="flex items-center gap-3 text-amber-700 bg-amber-50 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              Aucune matière assignée. Vous devez d'abord avoir des séances programmées avec une matière.
            </p>
          </div>
        ) : (
          <Select
            label="Sélectionner la matière et la classe"
            value={selectedKey}
            onChange={setSelectedKey}
            options={matiereOptions}
            placeholder="Choisir une matière..."
          />
        )}
      </div>

      {/* ── Infos matière sélectionnée ──────────────────────────────────────── */}
      {selectedMat && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Matière",   value: selectedMat.matiere_nom },
            { label: "Classe",    value: selectedMat.classe_nom },
            { label: "Semestre",  value: selectedMat.semestre_libelle },
            { label: "Année",     value: selectedMat.annee_libelle },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Statistiques ────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label:"Moyenne générale", value: stats.avg+"/20",  color:"text-blue-600"  },
            { label:"Meilleure note",   value: stats.max+"/20",  color:"text-green-600" },
            { label:"Note la plus basse",value: stats.min+"/20", color:"text-red-500"   },
            { label:"Reçus (≥10)",      value: `${stats.pass}/${stats.total}`, color:"text-green-600" },
            { label:"Taux de réussite", value: `${Math.round(stats.pass/stats.total*100)}%`, color: stats.pass/stats.total >= 0.5 ? "text-green-600":"text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-[10px] text-gray-400 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tableau des notes ───────────────────────────────────────────────── */}
      {selectedMat && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Barre de recherche + info */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              {etudiants.length} étudiant{etudiants.length > 1 ? "s" : ""}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
              <span>CC = 40%</span>
              <span>EF = 60%</span>
            </div>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : etudiants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucun étudiant dans cette classe</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Étudiant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Matricule</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CC /20</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">EF /20</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Moyenne</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((etud, i) => {
                    const moy = calcMoyenne(etud.id);
                    const men = mention(moy);
                    const mc  = mentionColor(moy);
                    return (
                      <tr key={etud.id}
                        className={`hover:bg-blue-50/30 transition ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                        {/* Étudiant */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <EtudAvatar etud={etud} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {etud.prenom} {etud.nom}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Matricule */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400 font-mono">{etud.matricule || "—"}</span>
                        </td>

                        {/* CC */}
                        <td className="px-4 py-3 text-center">
                          <NoteInput
                            value={edits[etud.id]?.cc ?? null}
                            onChange={v => setNote(etud.id, "cc", v)}
                            label=""
                          />
                        </td>

                        {/* EF */}
                        <td className="px-4 py-3 text-center">
                          <NoteInput
                            value={edits[etud.id]?.ef ?? null}
                            onChange={v => setNote(etud.id, "ef", v)}
                            label=""
                          />
                        </td>

                        {/* Moyenne */}
                        <td className="px-4 py-3 text-center">
                          {moy !== null ? (
                            <span className={`text-sm font-bold ${moy >= 10 ? "text-green-600" : "text-red-500"}`}>
                              {moy}/20
                            </span>
                          ) : <span className="text-gray-300 text-sm">—</span>}
                        </td>

                        {/* Mention */}
                        <td className="px-4 py-3 text-center">
                          {men ? (
                            <span className={`text-xs font-medium ${mc}`}>
                              {men}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer avec bouton sauvegarder */}
          {etudiants.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Formule : Moyenne = (CC × 0.4) + (EF × 0.6)
              </p>
              <button onClick={save} disabled={saving || !dirty}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition
                  ${dirty
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                {saving
                  ? <><Loader className="h-4 w-4 animate-spin" /> Enregistrement...</>
                  : <><Save className="h-4 w-4" /> {dirty ? "Enregistrer" : "Sauvegardé"}</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
          <button onClick={() => setToast(null)}><X className="h-3.5 w-3.5 ml-1" /></button>
        </div>
      )}
    </div>
  );
}