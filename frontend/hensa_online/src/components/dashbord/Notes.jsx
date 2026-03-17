// src/components/dashbord/Notes.jsx
// Utilisé par : ENSEIGNANT (saisie), ETUDIANT (consultation), ADMIN (consultation globale)
import { useState, useEffect } from "react";
import {
  BookOpen, Save, Loader, AlertCircle, Check,
  ChevronDown, Search, Users, X, TrendingUp,
  GraduationCap, FileText
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

const fullUrl      = url => !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;
const getInit      = (p="",n="") => `${p[0]??""}${n[0]??""}`.toUpperCase();
const mention      = m => m===null ? null : m>=16?"Très bien":m>=14?"Bien":m>=12?"Assez bien":m>=10?"Passable":"Insuffisant";
const mentionBadge = m => m===null?"":"px-2 py-0.5 rounded-full text-[10px] font-bold " +
  (m>=16?"bg-blue-100 text-blue-700":m>=14?"bg-green-100 text-green-700":
   m>=12?"bg-yellow-100 text-yellow-700":m>=10?"bg-orange-100 text-orange-700":"bg-red-100 text-red-700");

// ─── Select ───────────────────────────────────────────────────────────────────
function Select({ label, value, onChange, options, placeholder="Sélectionner...", disabled=false }) {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => String(o.value)===String(value));
  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <button type="button" disabled={disabled}
        onClick={() => setOpen(v=>!v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left transition
          ${disabled?"bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                    :"bg-white border-gray-200 hover:border-blue-400"}`}>
        <span className={`truncate pr-2 ${sel?"text-gray-800":"text-gray-400"}`}>{sel?.label??placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open?"rotate-180":""}`}/>
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-56 overflow-y-auto">
          {options.length===0
            ? <p className="p-3 text-sm text-gray-400 text-center">Aucune option</p>
            : options.map(o => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition
                  ${String(o.value)===String(value)?"bg-blue-50 text-blue-700 font-medium":"text-gray-800"}`}>
                {o.label}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
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

// ─── NoteInput ────────────────────────────────────────────────────────────────
function NoteInput({ value, onChange, readOnly=false }) {
  const num = value !== null && value !== "" ? parseFloat(value) : null;
  const border = num===null ? "border-gray-200 bg-white"
               : num>=10   ? "border-green-300 bg-green-50"
               :              "border-red-300 bg-red-50";
  return (
    <input type="number" min="0" max="20" step="0.25"
      value={value??""} readOnly={readOnly}
      onChange={e => onChange?.(e.target.value===""?null:parseFloat(e.target.value))}
      placeholder="—"
      className={`w-16 text-center py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition
        ${readOnly?"cursor-default":""} ${border}`}
    />
  );
}

// ─── Statistiques ─────────────────────────────────────────────────────────────
function Statistiques({ etudiants, getNote }) {
  const moyennes = etudiants.map(e => getNote(e.id)).filter(m => m!==null);
  if (!moyennes.length) return null;
  const avg  = Math.round(moyennes.reduce((a,b)=>a+b,0)/moyennes.length*100)/100;
  const max  = Math.max(...moyennes);
  const min  = Math.min(...moyennes);
  const pass = moyennes.filter(m=>m>=10).length;
  const rate = Math.round(pass/moyennes.length*100);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[
        { label:"Moyenne générale", value:`${avg}/20`, color:"text-blue-600" },
        { label:"Meilleure note",   value:`${max}/20`, color:"text-green-600" },
        { label:"Note la plus basse",value:`${min}/20`,color:"text-red-500" },
        { label:"Reçus (≥10)",      value:`${pass}/${moyennes.length}`, color:"text-green-600" },
        { label:"Taux de réussite", value:`${rate}%`, color:rate>=50?"text-green-600":"text-red-500" },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-[10px] text-gray-400 mb-1">{label}</p>
          <p className={`text-base font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE ENSEIGNANT — saisie des notes
// ══════════════════════════════════════════════════════════════════════════════
function VueEnseignant() {
  const [mesMatieres, setMesMatieres] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [etudiants,   setEtudiants]   = useState([]);
  const [edits,       setEdits]       = useState({});
  const [anneeId,     setAnneeId]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [dirty,       setDirty]       = useState(false);
  const [search,      setSearch]      = useState("");
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    api.get("/cours/mes-matieres").then(r => {
      setMesMatieres(r.data);
      if (r.data.length===1) {
        const m = r.data[0];
        setSelectedKey(`${m.matiere_id}_${m.classe_id}_${m.semestre_id}`);
      }
    }).catch(console.error);
  }, []);

  const selMat = mesMatieres.find(m =>
    `${m.matiere_id}_${m.classe_id}_${m.semestre_id}` === selectedKey
  );

  useEffect(() => {
    if (!selMat) { setEtudiants([]); setEdits({}); return; }
    setLoading(true);
    api.get(`/cours/notes?matiere_id=${selMat.matiere_id}&classe_id=${selMat.classe_id}&semestre_id=${selMat.semestre_id}`)
      .then(r => {
        setEtudiants(r.data.etudiants||[]);
        setAnneeId(r.data.annee_id);
        const init = {};
        (r.data.etudiants||[]).forEach(e => { init[e.id]={ cc:e.cc, ef:e.ef }; });
        setEdits(init); setDirty(false);
      }).catch(console.error).finally(()=>setLoading(false));
  }, [selectedKey]);

  const setNote = (id, field, val) => { setEdits(p=>({...p,[id]:{...p[id],[field]:val}})); setDirty(true); };
  const getMoy  = id => {
    const { cc, ef } = edits[id]||{};
    if (cc!=null && ef!=null) return Math.round((cc*0.4+ef*0.6)*100)/100;
    return null;
  };

  const save = async () => {
    if (!selMat||!anneeId) return;
    setSaving(true);
    try {
      const notes = etudiants.map(e => ({
        etudiant_id: e.id,
        matiere_id:  selMat.matiere_id,
        semestre_id: selMat.semestre_id,
        annee_id:    anneeId,
        cc: edits[e.id]?.cc ?? null,
        ef: edits[e.id]?.ef ?? null,
      }));
      await api.post("/cours/notes", { notes });
      setDirty(false);
      showToast(`${notes.length} note(s) enregistrée(s) !`);
    } catch (e) { showToast(e.response?.data?.error||"Erreur","error"); }
    finally { setSaving(false); }
  };

  const filtered = etudiants.filter(e =>
    `${e.prenom} ${e.nom} ${e.matricule||""}`.toLowerCase().includes(search.toLowerCase())
  );
  const matiereOptions = mesMatieres.map(m => ({
    value: `${m.matiere_id}_${m.classe_id}_${m.semestre_id}`,
    label: `${m.matiere_nom} — ${m.classe_nom} (${m.semestre_libelle||"Sem. ?"})`,
  }));

  return (
    <div className="space-y-4">
      {/* Sélection matière */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        {mesMatieres.length===0 ? (
          <div className="flex items-center gap-3 bg-amber-50 text-amber-700 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0"/>
            <p className="text-sm">Aucune matière assignée. Des séances avec matière doivent être programmées.</p>
          </div>
        ) : (
          <Select label="Sélectionner la matière et la classe" value={selectedKey}
            onChange={setSelectedKey} options={matiereOptions} placeholder="Choisir une matière..."/>
        )}
      </div>

      {/* Infos */}
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

      {/* Stats */}
      {selMat && etudiants.length>0 && (
        <Statistiques etudiants={etudiants} getNote={getMoy}/>
      )}

      {/* Tableau */}
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

          {loading ? <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
          : etudiants.length===0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Users className="h-10 w-10 text-gray-200 mb-3"/>
              <p className="text-gray-500">Aucun étudiant dans cette classe</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Étudiant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Matricule</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CC /20</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">EF /20</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Moyenne</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Mention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((etud,i) => {
                    const moy = getMoy(etud.id);
                    return (
                      <tr key={etud.id} className={i%2===0?"bg-white":"bg-gray-50/30"}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar etud={etud}/>
                            <p className="text-sm font-semibold text-gray-900">{etud.prenom} {etud.nom}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-400 font-mono">{etud.matricule||"—"}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <NoteInput value={edits[etud.id]?.cc??null} onChange={v=>setNote(etud.id,"cc",v)}/>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <NoteInput value={edits[etud.id]?.ef??null} onChange={v=>setNote(etud.id,"ef",v)}/>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {moy!==null
                            ? <span className={`text-sm font-bold ${moy>=10?"text-green-600":"text-red-500"}`}>{moy}/20</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          {moy!==null && <span className={mentionBadge(moy)}>{mention(moy)}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Moyenne = (CC × 0.4) + (EF × 0.6)</p>
            <button onClick={save} disabled={saving||!dirty}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition
                ${dirty?"bg-green-600 hover:bg-green-700 text-white":"bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
              {saving ? <><Loader className="h-4 w-4 animate-spin"/> Enregistrement...</>
                      : <><Save className="h-4 w-4"/> {dirty?"Enregistrer":"Sauvegardé"}</>}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type==="success"?"bg-green-600":"bg-red-600"}`}>
          {toast.type==="success"?<Check className="h-4 w-4"/>:<AlertCircle className="h-4 w-4"/>}
          {toast.msg}
          <button onClick={()=>setToast(null)}><X className="h-3.5 w-3.5 ml-1"/></button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VUE ÉTUDIANT — consultation de ses propres notes
// ══════════════════════════════════════════════════════════════════════════════
function VueEtudiant() {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/cours/notes/etudiant").then(r => setNotes(r.data)).finally(()=>setLoading(false));
  }, []);

  // Grouper par semestre
  const bySemestre = {};
  notes.forEach(n => {
    const k = n.semestre_libelle || `Semestre ${n.numero}`;
    if (!bySemestre[k]) bySemestre[k] = [];
    bySemestre[k].push(n);
  });

  // Moyenne générale
  const moyennes = notes.map(n=>n.moyenne).filter(m=>m!==null);
  const moyGen   = moyennes.length ? Math.round(moyennes.reduce((a,b)=>a+b,0)/moyennes.length*100)/100 : null;

  if (loading) return <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>;

  return (
    <div className="space-y-4">
      {/* Résumé */}
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

      {notes.length===0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
          <FileText className="h-12 w-12 text-gray-200 mb-3"/>
          <p className="text-gray-500 font-medium">Aucune note disponible</p>
          <p className="text-sm text-gray-400 mt-1">Vos notes apparaîtront ici une fois saisies par vos enseignants.</p>
        </div>
      ) : Object.entries(bySemestre).map(([sem, semNotes]) => {
        const smoys  = semNotes.map(n=>n.moyenne).filter(m=>m!==null);
        const smoyG  = smoys.length ? Math.round(smoys.reduce((a,b)=>a+b,0)/smoys.length*100)/100 : null;
        return (
          <div key={sem} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">{sem}</h3>
              {smoyG!==null && (
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
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Matière</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">UE</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CC</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">EF</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Moyenne</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Mention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {semNotes.map(n => (
                    <tr key={n.id} className="hover:bg-blue-50/20 transition">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{n.matiere_nom}</p>
                        {n.matiere_code && <p className="text-[10px] text-gray-400 font-mono">{n.matiere_code}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-500">{n.ue_nom}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${n.cc!=null?(n.cc>=10?"text-green-600":"text-red-500"):"text-gray-300"}`}>
                          {n.cc!=null?`${n.cc}/20`:"—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${n.ef!=null?(n.ef>=10?"text-green-600":"text-red-500"):"text-gray-300"}`}>
                          {n.ef!=null?`${n.ef}/20`:"—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.moyenne!=null
                          ? <span className={`text-sm font-bold ${n.moyenne>=10?"text-green-600":"text-red-500"}`}>{n.moyenne}/20</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {n.moyenne!=null && <span className={mentionBadge(n.moyenne)}>{mention(n.moyenne)}</span>}
                      </td>
                    </tr>
                  ))}
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
// VUE ADMIN — consultation de toutes les notes
// ══════════════════════════════════════════════════════════════════════════════
function VueAdmin() {
  const [classes,    setClasses]    = useState([]);
  const [matieres,   setMatieres]   = useState([]);
  const [notes,      setNotes]      = useState([]);
  const [classeId,   setClasseId]   = useState("");
  const [matiereId,  setMatiereId]  = useState("");
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    api.get("/cours/classes").then(r => setClasses(r.data));
  }, []);

  useEffect(() => {
    if (!classeId) { setMatieres([]); setNotes([]); return; }
    api.get(`/cours/matieres?classe_id=${classeId}`).then(r => setMatieres(r.data));
    setMatiereId("");
  }, [classeId]);

  useEffect(() => {
    if (!classeId) return;
    setLoading(true);
    const params = new URLSearchParams({ classe_id: classeId });
    if (matiereId) params.append("matiere_id", matiereId);
    api.get(`/cours/notes/all?${params}`)
      .then(r => setNotes(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [classeId, matiereId]);

  // Grouper par étudiant → matières
  const byEtud = {};
  notes.forEach(n => {
    if (!byEtud[n.etudiant_id]) byEtud[n.etudiant_id] = { ...n, notes:[] };
    byEtud[n.etudiant_id].notes.push(n);
  });
  const etudiants = Object.values(byEtud);
  const filtered  = etudiants.filter(e =>
    `${e.prenom} ${e.nom} ${e.matricule||""}`.toLowerCase().includes(search.toLowerCase())
  );

  const getMoyGen = etud => {
    const ms = etud.notes.map(n=>n.moyenne).filter(m=>m!==null);
    return ms.length ? Math.round(ms.reduce((a,b)=>a+b,0)/ms.length*100)/100 : null;
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Classe" value={classeId} onChange={setClasseId}
            options={classes.map(c=>({value:c.id,label:c.nom}))} placeholder="Choisir une classe..."/>
          <Select label="Matière (optionnel)" value={matiereId} onChange={setMatiereId}
            options={matieres.map(m=>({value:m.id,label:`${m.code?"["+m.code+"] ":""}${m.nom}`}))}
            placeholder="Toutes les matières" disabled={!classeId}/>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input type="text" placeholder="Nom, matricule..." value={search}
                onChange={e=>setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            </div>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {!classeId ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-gray-200 mb-3"/>
          <p className="text-gray-500">Sélectionnez une classe pour voir les notes</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
      ) : etudiants.length===0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
          <FileText className="h-12 w-12 text-gray-200 mb-3"/>
          <p className="text-gray-500">Aucune note trouvée pour cette classe</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4"/> {filtered.length} étudiant{filtered.length>1?"s":""}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map(etud => {
              const moyG = getMoyGen(etud);
              return (
                <details key={etud.etudiant_id} className="group">
                  <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition list-none">
                    <Avatar etud={etud}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{etud.prenom} {etud.nom}</p>
                      <p className="text-xs text-gray-400 font-mono">{etud.matricule||"—"}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-gray-400">{etud.notes.length} matière{etud.notes.length>1?"s":""}</span>
                      {moyG!==null && (
                        <span className={`font-bold ${moyG>=10?"text-green-600":"text-red-500"}`}>{moyG}/20</span>
                      )}
                      {moyG!==null && <span className={mentionBadge(moyG)}>{mention(moyG)}</span>}
                      <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform"/>
                    </div>
                  </summary>
                  <div className="px-5 pb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400">
                          <th className="text-left py-2">Matière</th>
                          <th className="text-center py-2">CC</th>
                          <th className="text-center py-2">EF</th>
                          <th className="text-center py-2">Moy.</th>
                          <th className="text-center py-2 hidden sm:table-cell">Mention</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {etud.notes.map(n => (
                          <tr key={n.id}>
                            <td className="py-2 font-medium text-gray-800">{n.matiere_nom}</td>
                            <td className="py-2 text-center text-gray-600">{n.cc!=null?`${n.cc}`:"—"}</td>
                            <td className="py-2 text-center text-gray-600">{n.ef!=null?`${n.ef}`:"—"}</td>
                            <td className="py-2 text-center">
                              {n.moyenne!=null
                                ? <span className={`font-bold ${n.moyenne>=10?"text-green-600":"text-red-500"}`}>{n.moyenne}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="py-2 text-center hidden sm:table-cell">
                              {n.moyenne!=null && <span className={mentionBadge(n.moyenne)}>{mention(n.moyenne)}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
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

  // Titre par rôle
  const subtitle = isAdmin ? "Consulter les notes de tous les étudiants"
                 : isEns   ? "Saisir les notes CC et EF de vos étudiants"
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