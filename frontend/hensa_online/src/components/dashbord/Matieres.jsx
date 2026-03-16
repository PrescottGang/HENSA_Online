// src/pages/Matieres.jsx
import { useState, useEffect } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Layers, GraduationCap, Clock, Hash, Save, X, Loader,
  BookMarked, FolderOpen, AlertCircle
} from "lucide-react";
import axios from "axios";

const API = "http://localhost:5000/api";
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// ─── Couleurs par niveau ──────────────────────────────────────────────────────
const NIVEAU_COLORS = [
  { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-500",    border: "border-blue-200 dark:border-blue-800"    },
  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", border: "border-violet-200 dark:border-violet-800" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800" },
];
const getColor = (index) => NIVEAU_COLORS[index % NIVEAU_COLORS.length];

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Formulaire UE ────────────────────────────────────────────────────────────
function UEForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ code: "", intitule: "", credits: 0, ...initial });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Code UE</label>
          <input value={form.code} onChange={(e) => set("code", e.target.value)}
            placeholder="ex: UE1"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Crédits</label>
          <input type="number" min={0} value={form.credits} onChange={(e) => set("credits", e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Intitulé *</label>
        <input value={form.intitule} onChange={(e) => set("intitule", e.target.value)}
          placeholder="ex: Mathématiques fondamentales"
          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition">Annuler</button>
        <button onClick={() => onSave(form)} disabled={!form.intitule.trim() || loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition">
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── Formulaire Matière ───────────────────────────────────────────────────────
function MatiereForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ code: "", nom: "", coefficient: 1, volume_horaire: 0, ...initial });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Code</label>
          <input value={form.code} onChange={(e) => set("code", e.target.value)}
            placeholder="ex: MATH101"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Coefficient *</label>
          <input type="number" min={0.5} step={0.5} value={form.coefficient} onChange={(e) => set("coefficient", e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom de la matière *</label>
        <input value={form.nom} onChange={(e) => set("nom", e.target.value)}
          placeholder="ex: Algèbre linéaire"
          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Volume horaire (h)</label>
        <input type="number" min={0} value={form.volume_horaire} onChange={(e) => set("volume_horaire", e.target.value)}
          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition">Annuler</button>
        <button onClick={() => onSave(form)} disabled={!form.nom.trim() || loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition">
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── Ligne Matière ────────────────────────────────────────────────────────────
function MatiereRow({ matiere, isAdmin, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {matiere.code && (
            <span className="text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
              {matiere.code}
            </span>
          )}
          <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{matiere.nom}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Hash className="h-3 w-3" />Coef. {Number(matiere.coefficient).toFixed(1)}
          </span>
          {Number(matiere.volume_horaire) > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" />{matiere.volume_horaire}h
            </span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(matiere)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(matiere)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bloc UE ──────────────────────────────────────────────────────────────────
function UEBlock({ ue, isAdmin, onEdit, onDelete, onAddMatiere, onEditMatiere, onDeleteMatiere }) {
  const [open, setOpen] = useState(true);
  const totalH = ue.matieres.reduce((a, m) => a + Number(m.volume_horaire || 0), 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header UE */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
        <button onClick={() => setOpen((v) => !v)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ue.code && (
              <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                {ue.code}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{ue.intitule}</span>
            {ue.credits > 0 && <span className="text-[11px] text-gray-400">{ue.credits} crédits</span>}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {ue.matieres.length} matière{ue.matieres.length !== 1 ? "s" : ""}
            {totalH > 0 && ` · ${totalH}h`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onAddMatiere(ue)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium transition">
              <Plus className="h-3.5 w-3.5" />Matière
            </button>
            <button onClick={() => onEdit(ue)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(ue)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Matières */}
      {open && (
        <div className="px-3 py-2 space-y-0.5 bg-white dark:bg-gray-900">
          {ue.matieres.length === 0 ? (
            <p className="text-xs text-gray-400 italic px-2 py-2">
              Aucune matière{isAdmin ? " — cliquez sur « + Matière »" : ""}
            </p>
          ) : (
            ue.matieres.map((m) => (
              <MatiereRow key={m.id} matiere={m} isAdmin={isAdmin}
                onEdit={onEditMatiere} onDelete={onDeleteMatiere} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bloc Semestre ────────────────────────────────────────────────────────────
function SemestreBlock({ semestre, filiereId, isAdmin, color, onAddUE, onEditUE, onDeleteUE, onAddMatiere, onEditMatiere, onDeleteMatiere }) {
  const [open, setOpen] = useState(true);
  const totalMatieres = semestre.ues.reduce((a, u) => a + u.matieres.length, 0);

  return (
    <div className={`rounded-xl border ${color.border} overflow-hidden`}>
      {/* Header semestre */}
      <div className={`flex items-center gap-3 px-4 py-3 ${color.bg}`}>
        <button onClick={() => setOpen((v) => !v)} className={`${color.text} flex-shrink-0`}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className={`w-2 h-2 rounded-full ${color.dot} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-bold ${color.text}`}>{semestre.libelle}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {semestre.ues.length} UE · {totalMatieres} matière{totalMatieres !== 1 ? "s" : ""}
          </span>
        </div>
        {isAdmin && (
          <button onClick={() => onAddUE(semestre)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${color.text} hover:bg-white/60 dark:hover:bg-white/10 transition`}>
            <Plus className="h-3.5 w-3.5" />UE
          </button>
        )}
      </div>

      {/* UEs */}
      {open && (
        <div className="p-3 space-y-2.5 bg-white dark:bg-gray-900">
          {semestre.ues.length === 0 ? (
            <div className="flex flex-col items-center py-5 text-center">
              <Layers className="h-7 w-7 text-gray-200 dark:text-gray-700 mb-2" />
              <p className="text-xs text-gray-400">Aucune UE dans ce semestre</p>
              {isAdmin && (
                <button onClick={() => onAddUE(semestre)} className="mt-1.5 text-xs text-blue-600 hover:underline">
                  + Ajouter une UE
                </button>
              )}
            </div>
          ) : (
            semestre.ues.map((ue) => (
              <UEBlock key={ue.id} ue={ue} isAdmin={isAdmin}
                onEdit={onEditUE} onDelete={onDeleteUE}
                onAddMatiere={onAddMatiere}
                onEditMatiere={onEditMatiere} onDeleteMatiere={onDeleteMatiere} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bloc Niveau ──────────────────────────────────────────────────────────────
function NiveauBlock({ niveau, niveauIndex, filiereId, isAdmin, onAddUE, onEditUE, onDeleteUE, onAddMatiere, onEditMatiere, onDeleteMatiere }) {
  const [open, setOpen] = useState(true);
  const color = getColor(niveauIndex);
  const totalUEs      = niveau.semestres.reduce((a, s) => a + s.ues.length, 0);
  const totalMatieres = niveau.semestres.reduce((a, s) => a + s.ues.reduce((b, u) => b + u.matieres.length, 0), 0);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Header niveau */}
      <div className={`flex items-center gap-3 px-5 py-4 ${color.bg} border-b ${color.border}`}>
        <button onClick={() => setOpen((v) => !v)} className={color.text}>
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <GraduationCap className={`h-5 w-5 ${color.text} flex-shrink-0`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${color.text}`}>{niveau.nom}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${color.text}`}>
              {niveau.cycle}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {niveau.semestres.length} semestres · {totalUEs} UE · {totalMatieres} matière{totalMatieres !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Semestres */}
      {open && (
        <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-gray-950">
          {niveau.semestres.map((sem) => (
            <SemestreBlock
              key={sem.id}
              semestre={sem}
              filiereId={filiereId}
              isAdmin={isAdmin}
              color={color}
              onAddUE={onAddUE}
              onEditUE={onEditUE}
              onDeleteUE={onDeleteUE}
              onAddMatiere={onAddMatiere}
              onEditMatiere={onEditMatiere}
              onDeleteMatiere={onDeleteMatiere}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Matieres() {
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";

  const [filieres, setFilieres]           = useState([]);
  const [selectedFiliere, setSelected]    = useState(null);
  const [niveaux, setNiveaux]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [modalUE,    setModalUE]    = useState(null); // { mode, semestre?, ue? }
  const [modalMat,   setModalMat]   = useState(null); // { mode, ue?, matiere? }
  const [confirmDel, setConfirmDel] = useState(null); // { type, item }

  // Charger filières
  useEffect(() => {
    apiClient.get("/matieres/filieres")
      .then((r) => { setFilieres(r.data || []); if (r.data?.length) setSelected(r.data[0]); })
      .catch(console.error);
  }, []);

  // Charger données quand filière change
  useEffect(() => {
    if (!selectedFiliere) return;
    setLoading(true);
    apiClient.get(`/matieres/data?filiere_id=${selectedFiliere.id}`)
      .then((r) => setNiveaux(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedFiliere]);

  // ─── UE ─────────────────────────────────────────────────────────────────
  const handleSaveUE = async (form) => {
    setActionLoading(true);
    try {
      if (modalUE.mode === "add") {
        const r = await apiClient.post("/matieres/ue", {
          filiere_id: selectedFiliere.id,
          semestre_id: modalUE.semestre.id,
          ...form,
        });
        setNiveaux((prev) => prev.map((n) => ({
          ...n,
          semestres: n.semestres.map((s) =>
            s.id !== modalUE.semestre.id ? s : { ...s, ues: [...s.ues, r.data] }
          ),
        })));
      } else {
        const r = await apiClient.put(`/matieres/ue/${modalUE.ue.id}`, form);
        setNiveaux((prev) => prev.map((n) => ({
          ...n,
          semestres: n.semestres.map((s) => ({
            ...s,
            ues: s.ues.map((u) => u.id === modalUE.ue.id ? { ...r.data, matieres: u.matieres } : u),
          })),
        })));
      }
      setModalUE(null);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleDeleteUE = async () => {
    setActionLoading(true);
    try {
      await apiClient.delete(`/matieres/ue/${confirmDel.item.id}`);
      setNiveaux((prev) => prev.map((n) => ({
        ...n,
        semestres: n.semestres.map((s) => ({ ...s, ues: s.ues.filter((u) => u.id !== confirmDel.item.id) })),
      })));
      setConfirmDel(null);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  // ─── Matières ────────────────────────────────────────────────────────────
  const handleSaveMatiere = async (form) => {
    setActionLoading(true);
    try {
      if (modalMat.mode === "add") {
        const r = await apiClient.post("/matieres/matieres", { ue_id: modalMat.ue.id, ...form });
        setNiveaux((prev) => prev.map((n) => ({
          ...n,
          semestres: n.semestres.map((s) => ({
            ...s,
            ues: s.ues.map((u) => u.id !== modalMat.ue.id ? u : { ...u, matieres: [...u.matieres, r.data] }),
          })),
        })));
      } else {
        const r = await apiClient.put(`/matieres/matieres/${modalMat.matiere.id}`, form);
        setNiveaux((prev) => prev.map((n) => ({
          ...n,
          semestres: n.semestres.map((s) => ({
            ...s,
            ues: s.ues.map((u) => ({
              ...u,
              matieres: u.matieres.map((m) => m.id === modalMat.matiere.id ? r.data : m),
            })),
          })),
        })));
      }
      setModalMat(null);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleDeleteMatiere = async () => {
    setActionLoading(true);
    try {
      await apiClient.delete(`/matieres/matieres/${confirmDel.item.id}`);
      setNiveaux((prev) => prev.map((n) => ({
        ...n,
        semestres: n.semestres.map((s) => ({
          ...s,
          ues: s.ues.map((u) => ({ ...u, matieres: u.matieres.filter((m) => m.id !== confirmDel.item.id) })),
        })),
      })));
      setConfirmDel(null);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  // Stats
  const totalUEs      = niveaux.reduce((a, n) => a + n.semestres.reduce((b, s) => b + s.ues.length, 0), 0);
  const totalMatieres = niveaux.reduce((a, n) => a + n.semestres.reduce((b, s) => b + s.ues.reduce((c, u) => c + u.matieres.length, 0), 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Gestion des matières
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">UE et matières par filière, niveau et semestre</p>
        </div>
        {niveaux.length > 0 && (
          <div className="flex gap-2">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold text-blue-600">{totalUEs}</p>
              <p className="text-[10px] text-blue-500 font-medium">UE</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold text-violet-600">{totalMatieres}</p>
              <p className="text-[10px] text-violet-500 font-medium">Matières</p>
            </div>
          </div>
        )}
      </div>

      {/* Sélecteur filière */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-medium text-gray-400 mb-2.5 uppercase tracking-wide">Filière</p>
        <div className="flex gap-2 flex-wrap">
          {filieres.map((f) => (
            <button key={f.id} onClick={() => setSelected(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                selectedFiliere?.id === f.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}>
              {f.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {!selectedFiliere ? (
        <div className="flex flex-col items-center justify-center py-20">
          <GraduationCap className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">Sélectionnez une filière</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-5">
          {niveaux.map((niveau, idx) => (
            <NiveauBlock
              key={niveau.id}
              niveau={niveau}
              niveauIndex={idx}
              filiereId={selectedFiliere.id}
              isAdmin={isAdmin}
              onAddUE={(sem) => setModalUE({ mode: "add", semestre: sem })}
              onEditUE={(ue) => setModalUE({ mode: "edit", ue })}
              onDeleteUE={(ue) => setConfirmDel({ type: "ue", item: ue })}
              onAddMatiere={(ue) => setModalMat({ mode: "add", ue })}
              onEditMatiere={(m) => setModalMat({ mode: "edit", matiere: m })}
              onDeleteMatiere={(m) => setConfirmDel({ type: "matiere", item: m })}
            />
          ))}
        </div>
      )}

      {/* Modal UE */}
      {modalUE && (
        <Modal
          title={modalUE.mode === "add"
            ? `Nouvelle UE — ${modalUE.semestre?.libelle}`
            : `Modifier l'UE — ${modalUE.ue?.intitule}`}
          onClose={() => setModalUE(null)}
        >
          <UEForm
            initial={modalUE.mode === "edit" ? modalUE.ue : {}}
            onSave={handleSaveUE}
            onCancel={() => setModalUE(null)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {/* Modal Matière */}
      {modalMat && (
        <Modal
          title={modalMat.mode === "add"
            ? `Nouvelle matière — ${modalMat.ue?.intitule}`
            : `Modifier — ${modalMat.matiere?.nom}`}
          onClose={() => setModalMat(null)}
        >
          <MatiereForm
            initial={modalMat.mode === "edit" ? modalMat.matiere : {}}
            onSave={handleSaveMatiere}
            onCancel={() => setModalMat(null)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {/* Confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Confirmer la suppression</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {confirmDel.type === "ue"
                    ? `Supprimer l'UE "${confirmDel.item.intitule}" et toutes ses matières ?`
                    : `Supprimer la matière "${confirmDel.item.nom}" ?`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button
                onClick={confirmDel.type === "ue" ? handleDeleteUE : handleDeleteMatiere}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition">
                {actionLoading ? <Loader className="h-4 w-4 animate-spin mx-auto" /> : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   