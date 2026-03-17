// src/components/dashbord/AnneeAcademique.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Plus, X, Trash2, LockKeyhole, BookOpen, AlertCircle,
  CheckCircle, Search, Wand2, TrendingUp, Users,
  ChevronRight, ChevronDown, Loader, Award, RotateCcw,
  GraduationCap, ArrowRight, RefreshCw
} from "lucide-react";

const API      = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";
const api = axios.create({ baseURL: API });
api.interceptors.request.use(c => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const fmtDate = s => !s ? "—" : new Date(s).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
const fullUrl  = url => !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;
const mention  = m => m===null?null:m>=16?"Très bien":m>=14?"Bien":m>=12?"Assez bien":m>=10?"Passable":"Insuffisant";
const mentionBadge = m => m===null?"" : "px-2 py-0.5 rounded-full text-[10px] font-bold " +
  (m>=16?"bg-blue-100 text-blue-700":m>=14?"bg-green-100 text-green-700":
   m>=12?"bg-yellow-100 text-yellow-700":m>=10?"bg-orange-100 text-orange-700":"bg-red-100 text-red-700");

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ etud }) {
  const [err, setErr] = useState(false);
  const photo = fullUrl(etud?.photo_profil);
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
      {photo && !err
        ? <img src={photo} alt="" className="w-full h-full object-cover" onError={() => setErr(true)}/>
        : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {(etud?.prenom?.[0]||"")+""+(etud?.nom?.[0]||"")}
          </div>
      }
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose,3500); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      ${type==="success"?"bg-green-50 text-green-800 border border-green-200":"bg-red-50 text-red-800 border border-red-200"}`}>
      {type==="success"?<CheckCircle className="h-4 w-4"/>:<AlertCircle className="h-4 w-4"/>}
      {msg}
      <button onClick={onClose}><X className="h-3.5 w-3.5 ml-1"/></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET BILAN
// ══════════════════════════════════════════════════════════════════════════════
function BilanPanel({ annee, onStatutsChanged, showToast }) {
  const [classes,    setClasses]    = useState([]);
  const [classeId,   setClasseId]   = useState("");
  const [bilan,      setBilan]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [decisions,  setDecisions]  = useState({}); // inscription_id → statut

  useEffect(() => {
    api.get("/cours/classes").then(r => setClasses(r.data)).catch(console.error);
  }, []);

  const loadBilan = useCallback(async () => {
    if (!annee) return;
    setLoading(true);
    try {
      const params = classeId ? `?classe_id=${classeId}` : "";
      const r = await api.get(`/annees/${annee.id}/bilan${params}`);
      setBilan(r.data||[]);
      // Initialiser les décisions depuis les statuts actuels
      const init = {};
      (r.data||[]).forEach(e => {
        if (e.statut_actuel !== "INSCRIT") init[e.inscription_id] = e.statut_actuel;
        else if (e.suggestion)             init[e.inscription_id] = e.suggestion;
      });
      setDecisions(init);
    } catch(e) { showToast(e.response?.data?.error||"Erreur chargement bilan","error"); }
    finally { setLoading(false); }
  }, [annee, classeId]);

  useEffect(() => { loadBilan(); }, [loadBilan]);

  const saveDecisions = async () => {
    const payload = Object.entries(decisions).map(([inscription_id, statut]) => ({
      inscription_id: parseInt(inscription_id), statut
    }));
    setSaving(true);
    try {
      await api.patch(`/annees/${annee.id}/bilan/statut`, { decisions: payload });
      showToast(`${payload.length} statut(s) enregistré(s) !`);
      loadBilan();
      onStatutsChanged?.();
    } catch(e) { showToast(e.response?.data?.error||"Erreur","error"); }
    finally { setSaving(false); }
  };

  const setAll = (statut) => {
    const d = {};
    bilan.forEach(e => { d[e.inscription_id] = statut; });
    setDecisions(d);
  };

  // Grouper par classe
  const byClasse = {};
  bilan.forEach(e => {
    if (!byClasse[e.classe_id]) byClasse[e.classe_id] = { nom: e.classe_nom, etudiants: [] };
    byClasse[e.classe_id].etudiants.push(e);
  });

  const nbAdmis      = Object.values(decisions).filter(s=>s==="ADMIS").length;
  const nbRedoublant = Object.values(decisions).filter(s=>s==="REDOUBLANT").length;
  const dirty = bilan.some(e => decisions[e.inscription_id] !== e.statut_actuel && e.statut_actuel !== decisions[e.inscription_id]);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={classeId} onChange={e=>setClasseId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
          <option value="">Toutes les classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setAll("ADMIS")}
            className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition border border-green-200">
            ✓ Tous admis
          </button>
          <button onClick={() => setAll("REDOUBLANT")}
            className="px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition border border-orange-200">
            ↩ Tous redoublants
          </button>
        </div>
      </div>

      {/* Compteurs */}
      {bilan.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Total étudiants", value:bilan.length, color:"text-gray-800" },
            { label:"Admis",          value:nbAdmis,       color:"text-green-600" },
            { label:"Redoublants",    value:nbRedoublant,  color:"text-orange-600" },
          ].map(({label,value,color})=>(
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
      ) : bilan.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-center">
          <TrendingUp className="h-12 w-12 text-gray-200 mb-3"/>
          <p className="text-gray-500 font-medium">Aucun étudiant trouvé</p>
          <p className="text-xs text-gray-400 mt-1">Vérifiez que des inscriptions existent pour cette année.</p>
        </div>
      ) : (
        <>
          {/* Tableau par classe */}
          {Object.entries(byClasse).map(([cId, { nom, etudiants }]) => (
            <div key={cId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">{nom}</h3>
                <span className="text-xs text-gray-400">{etudiants.length} étudiant{etudiants.length>1?"s":""}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Étudiant</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Moy. annuelle</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Décision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {etudiants.map(e => {
                      const dec = decisions[e.inscription_id];
                      return (
                        <tr key={e.etudiant_id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar etud={e}/>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{e.prenom} {e.nom}</p>
                                <p className="text-xs text-gray-400 font-mono">{e.matricule||"—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {e.moyenne_annuelle !== null
                              ? <div>
                                  <span className={`text-sm font-bold ${e.moyenne_annuelle>=10?"text-green-600":"text-red-500"}`}>
                                    {e.moyenne_annuelle}/20
                                  </span>
                                  <p className={mentionBadge(e.moyenne_annuelle) + " block mx-auto w-fit mt-0.5"}>
                                    {mention(e.moyenne_annuelle)}
                                  </p>
                                </div>
                              : <span className="text-gray-300 text-sm">Aucune note</span>
                            }
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-gray-500">{e.nb_notes}/{e.nb_matieres} mat.</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {/* ADMIS */}
                              <button onClick={() => setDecisions(p=>({...p,[e.inscription_id]:"ADMIS"}))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border
                                  ${dec==="ADMIS"
                                    ?"bg-green-600 text-white border-green-600 shadow-sm"
                                    :"bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600"}`}>
                                ✓ Admis
                              </button>
                              {/* REDOUBLANT */}
                              <button onClick={() => setDecisions(p=>({...p,[e.inscription_id]:"REDOUBLANT"}))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border
                                  ${dec==="REDOUBLANT"
                                    ?"bg-orange-500 text-white border-orange-500 shadow-sm"
                                    :"bg-white text-gray-500 border-gray-200 hover:border-orange-400 hover:text-orange-600"}`}>
                                ↩ Redoublant
                              </button>
                              {/* L3 → Diplômé */}
                              {!e.peut_passer && (
                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 ml-1">
                                  🎓 L3
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Bouton sauvegarder */}
          <div className="flex justify-end">
            <button onClick={saveDecisions} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition">
              {saving ? <><Loader className="h-4 w-4 animate-spin"/> Enregistrement...</> : <><CheckCircle className="h-4 w-4"/> Enregistrer les décisions</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET RÉINSCRIPTION
// ══════════════════════════════════════════════════════════════════════════════
function ReinscriptionPanel({ annee, showToast }) {
  const [preview,   setPreview]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [executing, setExecuting] = useState(false);
  const [done,      setDone]      = useState(false);
  const [result,    setResult]    = useState(null);

  const ACTION_STYLES = {
    PASSAGE:    { bg:"bg-green-50 border-green-200",  badge:"bg-green-100 text-green-700",  icon:"↑", label:"Passage" },
    REDOUBLANT: { bg:"bg-orange-50 border-orange-200",badge:"bg-orange-100 text-orange-700",icon:"↩", label:"Redoublant" },
    DIPLOME:    { bg:"bg-blue-50 border-blue-200",    badge:"bg-blue-100 text-blue-700",    icon:"🎓",label:"Diplômé" },
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/annees/${annee.id}/reinscription/preview`);
      setPreview(r.data);
    } catch(e) { showToast(e.response?.data?.error||"Erreur","error"); }
    finally { setLoading(false); }
  };

  const execute = async () => {
    if (!window.confirm("Confirmer le passage en classe supérieure ? Cette action modifiera les inscriptions et les classes des étudiants.")) return;
    setExecuting(true);
    try {
      const r = await api.post(`/annees/${annee.id}/reinscription/executer`);
      setResult(r.data);
      setDone(true);
      showToast(r.data.message);
    } catch(e) { showToast(e.response?.data?.error||"Erreur","error"); }
    finally { setExecuting(false); }
  };

  if (!preview && !loading) return (
    <div className="flex flex-col items-center py-16 text-center">
      <GraduationCap className="h-14 w-14 text-gray-200 mb-4"/>
      <h3 className="font-semibold text-gray-700 mb-1">Réinscription pour la nouvelle année</h3>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        Cette opération va calculer le passage en classe supérieure pour tous les étudiants
        dont le bilan a été validé (ADMIS → classe +1, REDOUBLANT → même classe, L3 ADMIS → diplômé).
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6 max-w-md text-left">
        <p className="font-semibold mb-1">⚠️ Prérequis :</p>
        <ul className="space-y-0.5 text-xs list-disc list-inside">
          <li>Les bilans doivent être validés (onglet Bilan)</li>
          <li>La nouvelle année académique doit exister</li>
          <li>Les classes de la nouvelle année doivent être générées</li>
        </ul>
      </div>
      <button onClick={loadPreview}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition">
        <RefreshCw className="h-4 w-4"/> Calculer l'aperçu
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-blue-500"/></div>
  );

  if (done && result) return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle className="h-8 w-8 text-green-600"/>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Réinscription terminée !</h3>
      <p className="text-gray-500 mb-6 max-w-sm">{result.message}</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label:"Passages",     value:result.stats.passages,    color:"text-green-600" },
          { label:"Redoublants",  value:result.stats.redoublants, color:"text-orange-600" },
          { label:"Diplômés",     value:result.stats.diplomes,    color:"text-blue-600" },
        ].map(({label,value,color})=>(
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center min-w-[100px]">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {result.stats.erreurs?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-left max-w-md">
          <p className="font-semibold mb-1">{result.stats.erreurs.length} erreur(s) :</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {result.stats.erreurs.map((e,i)=><li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Avertissement */}
      {preview?.avertissement && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5"/>
          {preview.avertissement}
        </div>
      )}

      {/* Stats */}
      {preview?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:"Total",       value:preview.stats.total,       color:"text-gray-800" },
            { label:"Passages",    value:preview.stats.passages,    color:"text-green-600" },
            { label:"Redoublants", value:preview.stats.redoublants, color:"text-orange-600" },
            { label:"Diplômés",    value:preview.stats.diplomes,    color:"text-blue-600" },
          ].map(({label,value,color})=>(
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Année cible */}
      {preview?.annee_suivante && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">{preview.annee_actuelle?.libelle}</span>
            <ArrowRight className="h-4 w-4 text-gray-400"/>
            <span className="font-bold text-blue-700">{preview.annee_suivante?.libelle}</span>
          </div>
          {preview.stats?.erreurs > 0 && (
            <span className="ml-auto text-xs text-red-600 font-medium">
              ⚠️ {preview.stats.erreurs} classe(s) introuvable(s)
            </span>
          )}
        </div>
      )}

      {/* Liste des étudiants */}
      {preview?.inscriptions?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Détail des mouvements</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {preview.inscriptions.map(e => {
              const st = ACTION_STYLES[e.action] || ACTION_STYLES.PASSAGE;
              return (
                <div key={e.inscription_id} className={`flex items-center gap-3 px-5 py-3 ${e.avertissement?"bg-red-50":""}`}>
                  <Avatar etud={e}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{e.prenom} {e.nom}</p>
                    <p className="text-xs text-gray-400 truncate">{e.classe_nom}</p>
                    {e.avertissement && (
                      <p className="text-xs text-red-500 mt-0.5">⚠️ {e.avertissement}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${st.badge}`}>
                      {st.icon} {st.label}
                    </span>
                    {e.action !== "DIPLOME" && e.classe_destination && (
                      <span className="text-gray-400 hidden sm:block">→ {e.classe_destination.nom}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boutons */}
      <div className="flex items-center justify-between">
        <button onClick={loadPreview}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="h-3.5 w-3.5"/> Recalculer
        </button>
        <button onClick={execute} disabled={executing || !preview?.annee_suivante || !preview?.inscriptions?.length}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition">
          {executing ? <><Loader className="h-4 w-4 animate-spin"/> Exécution...</> : <><GraduationCap className="h-4 w-4"/> Exécuter la réinscription</>}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function AnneeAcademique() {
  const [years,       setYears]       = useState([]);
  const [search,      setSearch]      = useState("");
  const [tab,         setTab]         = useState("ACTIVE");      // liste onglets
  const [subTab,      setSubTab]      = useState("annees");      // annees | bilan | reinscription
  const [selectedAnnee, setSelectedAnnee] = useState(null);
  const [open,        setOpen]        = useState(false);
  const [form,        setForm]        = useState({ libelle:"", date_debut:"", date_fin:"" });
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [toast,       setToast]       = useState(null);
  const [confirmDlg,  setConfirmDlg]  = useState({ open:false, id:null, action:null });

  const showToast = (msg, type="success") => setToast({ msg, type });

  const fetchYears = useCallback(async () => {
    try {
      const r = await api.get("/annees");
      setYears(r.data||[]);
      // Sélectionner automatiquement l'année active pour le bilan
      const active = (r.data||[]).find(y=>y.statut==="ACTIVE");
      if (active && !selectedAnnee) setSelectedAnnee(active);
    } catch { showToast("Erreur de chargement","error"); }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (new Date(form.date_fin) <= new Date(form.date_debut))
      return setError("La date de fin doit être postérieure à la date de début.");
    setLoading(true);
    try {
      await api.post("/annees", form);
      showToast("Année académique créée avec succès !");
      setForm({ libelle:"", date_debut:"", date_fin:"" });
      setOpen(false);
      fetchYears();
    } catch(err) { setError(err.response?.data?.error||"Erreur lors de la création"); }
    finally { setLoading(false); }
  };

  const handleGenerateClasses = async (id) => {
    if (!window.confirm("Générer les classes pour cette année ?")) return;
    try {
      const r = await api.post(`/annees/${id}/generer-classes`);
      showToast(r.data.message);
    } catch(err) { showToast(err.response?.data?.error||"Erreur","error"); }
  };

  const handleAction = async () => {
    const { id, action } = confirmDlg;
    try {
      if (action==="cloturer") await api.patch(`/annees/${id}/cloturer`);
      if (action==="delete")   await api.delete(`/annees/${id}`);
      showToast(action==="delete"?"Année supprimée.":"Année clôturée.");
      fetchYears();
    } catch { showToast("Erreur","error"); }
    finally { setConfirmDlg({ open:false, id:null, action:null }); }
  };

  const filtered = years.filter(y => {
    const matchSearch = y.libelle.toLowerCase().includes(search.toLowerCase());
    const matchTab    = tab==="ACTIVE" ? y.statut==="ACTIVE" : y.statut!=="ACTIVE";
    return matchSearch && matchTab;
  });

  const activeYear = years.find(y=>y.statut==="ACTIVE");

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600"/> Année académique
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestion, bilan et réinscription des étudiants</p>
        </div>
        <button onClick={() => { setOpen(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-xl transition">
          <Plus className="h-4 w-4"/> Nouvelle année
        </button>
      </div>

      {/* ── Onglets principaux ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id:"annees",        label:"Années académiques" },
            { id:"bilan",         label:"Bilan de fin d'année" },
            { id:"reinscription", label:"Réinscription" },
          ].map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition
                ${subTab===t.id?"border-blue-600 text-blue-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ══ LISTE DES ANNÉES ══ */}
          {subTab==="annees" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
                  {["ACTIVE","CLOTUREE"].map(s => (
                    <button key={s} onClick={() => setTab(s)}
                      className={`px-4 py-2 font-medium transition ${tab===s?"bg-blue-600 text-white":"text-gray-500 hover:bg-gray-50"}`}>
                      {s==="ACTIVE"?"En cours":"Archives"}
                    </button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                  <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left">Libellé</th>
                      <th className="px-4 py-3 text-left">Début</th>
                      <th className="px-4 py-3 text-left">Fin</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Aucune année trouvée.</td></tr>
                    ) : filtered.map(y => (
                      <tr key={y.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-semibold text-gray-800">{y.libelle}</td>
                        <td className="px-4 py-4 text-gray-500">{fmtDate(y.date_debut)}</td>
                        <td className="px-4 py-4 text-gray-500">{fmtDate(y.date_fin)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${y.statut==="ACTIVE"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>
                            {y.statut==="ACTIVE"?"Active":"Clôturée"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {y.statut==="ACTIVE" && (
                              <>
                                <button onClick={()=>handleGenerateClasses(y.id)} title="Générer les classes"
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                  <Wand2 className="h-4 w-4"/>
                                </button>
                                <button onClick={()=>{setSelectedAnnee(y);setSubTab("bilan");}} title="Voir le bilan"
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition">
                                  <TrendingUp className="h-4 w-4"/>
                                </button>
                                <button onClick={()=>{setSelectedAnnee(y);setSubTab("reinscription");}} title="Réinscription"
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition">
                                  <GraduationCap className="h-4 w-4"/>
                                </button>
                              </>
                            )}
                            <button onClick={()=>setConfirmDlg({open:true,id:y.id,action:"cloturer"})} title="Clôturer"
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition">
                              <LockKeyhole className="h-4 w-4"/>
                            </button>
                            <button onClick={()=>setConfirmDlg({open:true,id:y.id,action:"delete"})} title="Supprimer"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                              <Trash2 className="h-4 w-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══ BILAN ══ */}
          {subTab==="bilan" && (
            <>
              {/* Sélecteur d'année */}
              <div className="flex items-center gap-3 mb-4">
                <select value={selectedAnnee?.id||""} onChange={e => {
                    const y = years.find(y=>String(y.id)===e.target.value);
                    setSelectedAnnee(y||null);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="">Choisir une année...</option>
                  {years.map(y=><option key={y.id} value={y.id}>{y.libelle} {y.statut==="ACTIVE"?"(Active)":"(Clôturée)"}</option>)}
                </select>
              </div>
              {selectedAnnee
                ? <BilanPanel annee={selectedAnnee} showToast={showToast} onStatutsChanged={fetchYears}/>
                : <div className="flex flex-col items-center py-16 text-center">
                    <TrendingUp className="h-12 w-12 text-gray-200 mb-3"/>
                    <p className="text-gray-500">Sélectionnez une année académique</p>
                  </div>
              }
            </>
          )}

          {/* ══ RÉINSCRIPTION ══ */}
          {subTab==="reinscription" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <select value={selectedAnnee?.id||""} onChange={e => {
                    const y = years.find(y=>String(y.id)===e.target.value);
                    setSelectedAnnee(y||null);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  <option value="">Choisir l'année source...</option>
                  {years.map(y=><option key={y.id} value={y.id}>{y.libelle} {y.statut==="ACTIVE"?"(Active)":"(Clôturée)"}</option>)}
                </select>
              </div>
              {selectedAnnee
                ? <ReinscriptionPanel annee={selectedAnnee} showToast={showToast}/>
                : <div className="flex flex-col items-center py-16 text-center">
                    <GraduationCap className="h-12 w-12 text-gray-200 mb-3"/>
                    <p className="text-gray-500">Sélectionnez l'année source</p>
                  </div>
              }
            </>
          )}
        </div>
      </div>

      {/* ── Modal confirmation ──────────────────────────────────────── */}
      {confirmDlg.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Confirmer l'action</h3>
            <p className="text-sm text-gray-500 mb-6">
              {confirmDlg.action==="delete"
                ? "Supprimer cette année académique ? Toutes les classes associées seront également supprimées."
                : "Clôturer cette année ? Elle passera en statut Archivée."}
            </p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDlg({open:false})}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleAction}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition
                  ${confirmDlg.action==="delete"?"bg-red-600 hover:bg-red-700":"bg-amber-600 hover:bg-amber-700"}`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal créer année ───────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nouvelle année académique</h3>
              <button onClick={()=>setOpen(false)}><X className="h-5 w-5 text-gray-400"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0"/>{error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
                <input required placeholder="2027-2028" value={form.libelle}
                  onChange={e=>setForm({...form,libelle:e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
                  <input type="date" required value={form.date_debut}
                    onChange={e=>setForm({...form,date_debut:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin *</label>
                  <input type="date" required value={form.date_fin}
                    onChange={e=>setForm({...form,date_fin:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                💡 La création d'une nouvelle année archive automatiquement l'année active actuelle.
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition">
                {loading?"Enregistrement...":"Créer l'année"}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}