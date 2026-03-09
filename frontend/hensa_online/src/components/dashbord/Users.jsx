import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search, UserPlus, X, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle, Loader, Users, GraduationCap,
  BookOpen, RefreshCw
} from "lucide-react";

const API = "http://localhost:5000/api";
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const emptyForm = {
  nom: "", prenom: "", email: "", password: "",
  matricule: "", classe_id: "", specialite: "", grade: "",
};

const UsersManagement = () => {
  const [searchQuery, setSearchQuery]   = useState("");
  const [students, setStudents]         = useState([]);
  const [teachers, setTeachers]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [activeTab, setActiveTab]       = useState("students");
  const [open, setOpen]                 = useState(false);
  const [formType, setFormType]         = useState("student");
  const [form, setForm]                 = useState(emptyForm);
  const [loading, setLoading]           = useState(false);
  const [loadingData, setLoadingData]   = useState({ students: false, teachers: false, classes: false });
  const [error, setError]               = useState("");
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  useEffect(() => { fetchAllData(); }, []);
  const fetchAllData = () => Promise.all([fetchStudents(), fetchTeachers(), fetchClasses()]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const fetchStudents = async () => {
    setLoadingData(prev => ({ ...prev, students: true }));
    try {
      const res = await apiClient.get("/users/etudiants");
      setStudents(res.data);
    } catch (err) {
      showNotification("Erreur lors du chargement des etudiants", "error");
    } finally {
      setLoadingData(prev => ({ ...prev, students: false }));
    }
  };

  const fetchTeachers = async () => {
    setLoadingData(prev => ({ ...prev, teachers: true }));
    try {
      const res = await apiClient.get("/users/enseignants");
      setTeachers(res.data);
    } catch (err) {
      showNotification("Erreur lors du chargement des enseignants", "error");
    } finally {
      setLoadingData(prev => ({ ...prev, teachers: false }));
    }
  };

  const fetchClasses = async () => {
    setLoadingData(prev => ({ ...prev, classes: true }));
    try {
      const res = await apiClient.get("/users/classes");
      setClasses(res.data);
      if (res.data.length === 0)
        showNotification("Aucune classe trouvee dans la base de donnees", "warning");
    } catch (err) {
      showNotification("Erreur lors du chargement des classes", "error");
    } finally {
      setLoadingData(prev => ({ ...prev, classes: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!form.email.includes("@")) { setError("Format d'email invalide"); setLoading(false); return; }
    if (form.password.length < 6)  { setError("Mot de passe : min. 6 caracteres"); setLoading(false); return; }
    try {
      if (formType === "student") {
        if (!form.matricule || !form.classe_id) { setError("Matricule et classe obligatoires"); setLoading(false); return; }
        const res = await apiClient.post("/users/etudiants", {
          nom: form.nom.trim(), prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(), mot_de_passe: form.password,
          matricule: form.matricule.trim().toUpperCase(), classe_id: form.classe_id,
        });
        await fetchStudents();
        showNotification(res.data.message || "Etudiant ajoute avec succes");
      } else {
        const res = await apiClient.post("/users/enseignants", {
          nom: form.nom.trim(), prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(), mot_de_passe: form.password,
          specialite: form.specialite.trim() || null, grade: form.grade.trim() || null,
        });
        await fetchTeachers();
        showNotification(res.data.message || "Enseignant ajoute avec succes");
      }
      setOpen(false);
      setForm(emptyForm);
    } catch (err) {
      const msg = err.response?.data?.error || "Une erreur est survenue.";
      setError(msg);
      showNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatut = async (id, currentStatut, type) => {
    const newStatut = currentStatut === "ACTIF" ? "INACTIF" : "ACTIF";
    const route = type === "student" ? "etudiants" : "enseignants";
    try {
      await apiClient.patch(`/users/${route}/${id}/statut`, { statut: newStatut });
      type === "student" ? await fetchStudents() : await fetchTeachers();
      showNotification("Statut modifie avec succes");
    } catch { showNotification("Erreur modification statut", "error"); }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    const route = type === "student" ? "etudiants" : "enseignants";
    try {
      await apiClient.delete(`/users/${route}/${id}`);
      type === "student" ? await fetchStudents() : await fetchTeachers();
      showNotification("Utilisateur supprime avec succes");
    } catch { showNotification("Erreur lors de la suppression", "error"); }
  };

  const initials = (prenom, nom) => `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase() || "?";
  const classeLabel = (c) => `${c.filiere_nom} - ${c.niveau_nom}${c.cycle ? ` (${c.cycle})` : ""}`;

  const filteredStudents = students.filter((s) =>
    [s.nom, s.prenom, s.email, s.matricule, s.filiere_nom, s.niveau_nom].some((v) =>
      v?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  const filteredTeachers = teachers.filter((t) =>
    [t.nom, t.prenom, t.email, t.specialite, t.grade].some((v) =>
      v?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const inputClass = "px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition w-full";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            notification.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
            notification.type === "warning" ? "bg-yellow-50 text-yellow-800 border border-yellow-200" :
            "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {notification.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                <p className="text-sm text-gray-500">{students.length} etudiants · {teachers.length} enseignants</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Rechercher..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-80 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <button onClick={() => { setFormType("student"); setOpen(true); setError(""); setForm(emptyForm); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition whitespace-nowrap">
                <UserPlus className="h-4 w-4" /> Ajouter
              </button>
              <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition" title="Actualiser">
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex gap-1 border-b border-gray-200 px-4">
            {[
              { key: "students", label: "Etudiants",   icon: GraduationCap, count: students.length },
              { key: "teachers", label: "Enseignants", icon: BookOpen,       count: teachers.length },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                  activeTab === tab.key ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {activeTab === "students" && (
            <div className="overflow-x-auto">
              {loadingData.students ? (
                <div className="flex items-center justify-center py-20"><Loader className="h-8 w-8 text-blue-600 animate-spin" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>{["Etudiant","Email","Matricule","Filiere","Niveau","Statut","Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-20 text-gray-400">
                        {searchQuery ? "Aucun resultat trouve" : "Aucun etudiant trouve"}
                      </td></tr>
                    ) : filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">{initials(s.prenom, s.nom)}</div>
                            <span className="font-medium text-gray-800">{s.prenom} {s.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.email}</td>
                        <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{s.matricule || "-"}</span></td>
                        <td className="px-4 py-3">
                          {s.filiere_nom ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">{s.filiere_nom}</span> : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {s.niveau_nom ? (
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              {s.niveau_nom}{s.cycle && <span className="ml-1 opacity-70">({s.cycle})</span>}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{s.statut}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleStatut(s.id, s.statut, "student")} className="p-1.5 rounded hover:bg-gray-100 transition">
                              {s.statut === "ACTIF" ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                            </button>
                            <button onClick={() => handleDelete(s.id, "student")} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "teachers" && (
            <div className="overflow-x-auto">
              {loadingData.teachers ? (
                <div className="flex items-center justify-center py-20"><Loader className="h-8 w-8 text-blue-600 animate-spin" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>{["Enseignant","Email","Specialite","Grade","Statut","Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeachers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-20 text-gray-400">
                        {searchQuery ? "Aucun resultat trouve" : "Aucun enseignant trouve"}
                      </td></tr>
                    ) : filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">{initials(t.prenom, t.nom)}</div>
                            <span className="font-medium text-gray-800">{t.prenom} {t.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.email}</td>
                        <td className="px-4 py-3">
                          {t.specialite ? <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">{t.specialite}</span> : "-"}
                        </td>
                        <td className="px-4 py-3">{t.grade || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{t.statut}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleStatut(t.id, t.statut, "teacher")} className="p-1.5 rounded hover:bg-gray-100 transition">
                              {t.statut === "ACTIF" ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                            </button>
                            <button onClick={() => handleDelete(t.id, "teacher")} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Ajouter un {formType === "student" ? "etudiant" : "enseignant"}
              </h3>
              <button onClick={() => { setOpen(false); setError(""); setForm(emptyForm); }}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                {["student","teacher"].map((type) => (
                  <button key={type} type="button" onClick={() => { setFormType(type); setError(""); setForm(emptyForm); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${formType === type ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {type === "student" ? "Etudiant" : "Enseignant"}
                  </button>
                ))}
              </div>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Prenom *" value={form.prenom} required onChange={(e) => setForm({ ...form, prenom: e.target.value })} className={inputClass} />
                  <input placeholder="Nom *" value={form.nom} required onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputClass} />
                </div>
                <input type="email" placeholder="Email institutionnel *" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                <input type="password" placeholder="Mot de passe (min. 6 caracteres) *" value={form.password} required minLength="6" onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />

                {formType === "student" ? (
                  <>
                    <input placeholder="Matricule (ex: 2024-INFO-0001) *" value={form.matricule} required
                      onChange={(e) => setForm({ ...form, matricule: e.target.value.toUpperCase() })} className={inputClass} />
                    <div>
                      <select value={form.classe_id} required onChange={(e) => setForm({ ...form, classe_id: e.target.value })} className={`${inputClass} bg-white`}>
                        <option value="">-- Selectionner une classe (filiere + niveau) * --</option>
                        {loadingData.classes ? <option disabled>Chargement...</option>
                          : classes.length === 0 ? <option disabled>Aucune classe disponible</option>
                          : classes.map((c) => <option key={c.id} value={c.id}>{classeLabel(c)}</option>)}
                      </select>
                      {classes.length === 0 && !loadingData.classes && (
                        <p className="text-xs text-amber-600 mt-1">Aucune classe trouvee. Creez d'abord des classes.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <input placeholder="Specialite (ex: Informatique)" value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} className={inputClass} />
                    <input placeholder="Grade (ex: Maitre de conferences)" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={inputClass} />
                  </>
                )}

                <button type="submit" disabled={loading || (formType === "student" && classes.length === 0)}
                  className="w-full mt-2 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><Loader className="h-4 w-4 animate-spin" /> Enregistrement...</> : "Enregistrer"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;