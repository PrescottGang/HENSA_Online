// src/pages/UsersManagement.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search, UserPlus, X, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle, Loader, Users, GraduationCap,
  BookOpen, RefreshCw, Mail, Eye, ChevronLeft, ChevronRight,
  Phone, MapPin, Calendar, Award, Hash
} from "lucide-react";

const API      = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;

const emptyForm = {
  nom: "", prenom: "", email: "",
  matricule: "", classe_id: "", specialite: "", grade: "",
};

// ─── Avatar universel ─────────────────────────────────────────────────────────
function UserAvatar({ user, size = "md", className = "" }) {
  const [imgError, setImgError] = useState(false);
  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase() || "?";
  const photoUrl = fullUrl(user?.photo_profil);
  const sizes = {
    sm:  "w-8 h-8 text-xs",
    md:  "w-10 h-10 text-sm",
    lg:  "w-16 h-16 text-xl",
    xl:  "w-24 h-24 text-3xl",
  };
  const colors = {
    ETUDIANT:   "from-blue-500 to-indigo-600",
    ENSEIGNANT: "from-purple-500 to-violet-600",
    ADMIN:      "from-emerald-500 to-teal-600",
  };
  const gradient = colors[user?.role] || "from-gray-400 to-gray-500";

  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 overflow-hidden ${className}`}>
      {photoUrl && !imgError ? (
        <img
          src={photoUrl} alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold`}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Notification ─────────────────────────────────────────────────────────────
function Notification({ notif }) {
  if (!notif.show) return null;
  const styles = {
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    error:   "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${styles[notif.type] || styles.success}`}>
      {notif.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {notif.message}
    </div>
  );
}

// ─── Drawer Profil Utilisateur ────────────────────────────────────────────────
function UserProfileDrawer({ user: u, onClose }) {
  if (!u) return null;

  const ROLE_STYLE = {
    ETUDIANT:   "bg-blue-100 text-blue-700",
    ENSEIGNANT: "bg-purple-100 text-purple-700",
    ADMIN:      "bg-emerald-100 text-emerald-700",
  };
  const ROLE_LABEL = {
    ETUDIANT:   "Étudiant",
    ENSEIGNANT: "Enseignant",
    ADMIN:      "Administrateur",
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in">

        {/* Header coloré */}
        <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar chevauchant */}
        <div className="px-6 -mt-10 mb-4 flex-shrink-0">
          <div className="flex items-end justify-between">
            <UserAvatar user={u} size="xl" className="ring-4 ring-white shadow-lg" />
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ROLE_STYLE[u.role]}`}>
              {ROLE_LABEL[u.role]}
            </span>
          </div>
        </div>

        {/* Infos */}
        <div className="px-6 flex-1 overflow-y-auto space-y-5 pb-6">
          {/* Nom */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{u.prenom} {u.nom}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5" />{u.email}
            </p>
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${u.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${u.statut === "ACTIF" ? "bg-green-500" : "bg-red-400"}`} />
              {u.statut === "ACTIF" ? "Compte actif" : "Compte inactif"}
            </span>
          </div>

          <hr className="border-gray-100" />

          {/* Infos spécifiques */}
          {u.role === "ETUDIANT" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scolarité</h3>
              {u.matricule && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Hash className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Matricule</p>
                    <p className="font-mono font-semibold text-gray-800">{u.matricule}</p>
                  </div>
                </div>
              )}
              {u.filiere_nom && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Filière</p>
                    <p className="font-semibold text-gray-800">{u.filiere_nom}</p>
                  </div>
                </div>
              )}
              {u.niveau_nom && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Niveau</p>
                    <p className="font-semibold text-gray-800">
                      {u.niveau_nom}{u.cycle && <span className="ml-1 text-gray-400 text-xs">({u.cycle})</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {u.role === "ENSEIGNANT" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informations</h3>
              {u.specialite && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Spécialité</p>
                    <p className="font-semibold text-gray-800">{u.specialite}</p>
                  </div>
                </div>
              )}
              {u.grade && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Grade</p>
                    <p className="font-semibold text-gray-800">{u.grade}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────
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
  const [selectedUser, setSelectedUser] = useState(null); // drawer profil

  useEffect(() => { fetchAllData(); }, []);
  const fetchAllData = () => Promise.all([fetchStudents(), fetchTeachers(), fetchClasses()]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 4000);
  };

  const fetchStudents = async () => {
    setLoadingData(prev => ({ ...prev, students: true }));
    try {
      const res = await apiClient.get("/users/etudiants");
      setStudents(res.data);
    } catch { showNotification("Erreur chargement étudiants", "error"); }
    finally { setLoadingData(prev => ({ ...prev, students: false })); }
  };

  const fetchTeachers = async () => {
    setLoadingData(prev => ({ ...prev, teachers: true }));
    try {
      const res = await apiClient.get("/users/enseignants");
      setTeachers(res.data);
    } catch { showNotification("Erreur chargement enseignants", "error"); }
    finally { setLoadingData(prev => ({ ...prev, teachers: false })); }
  };

  const fetchClasses = async () => {
    setLoadingData(prev => ({ ...prev, classes: true }));
    try {
      const res = await apiClient.get("/users/classes");
      setClasses(res.data);
    } catch { showNotification("Erreur chargement classes", "error"); }
    finally { setLoadingData(prev => ({ ...prev, classes: false })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!form.email.includes("@")) { setError("Format d'email invalide"); setLoading(false); return; }
    try {
      if (formType === "student") {
        if (!form.classe_id) { setError("La classe est obligatoire"); setLoading(false); return; }
        const res = await apiClient.post("/users/etudiants", {
          nom: form.nom.trim(), prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(), classe_id: form.classe_id,
        });
        await fetchStudents();
        showNotification(
          res.data.emailSent ? "Étudiant ajouté · Identifiants envoyés ✉️" : "Étudiant ajouté (⚠️ email non envoyé)",
          res.data.emailSent ? "success" : "warning"
        );
      } else {
        const res = await apiClient.post("/users/enseignants", {
          nom: form.nom.trim(), prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(),
          specialite: form.specialite.trim() || null,
          grade: form.grade.trim() || null,
        });
        await fetchTeachers();
        showNotification(
          res.data.emailSent ? "Enseignant ajouté · Identifiants envoyés ✉️" : "Enseignant ajouté (⚠️ email non envoyé)",
          res.data.emailSent ? "success" : "warning"
        );
      }
      setOpen(false);
      setForm(emptyForm);
    } catch (err) {
      const msg = err.response?.data?.error || "Une erreur est survenue.";
      setError(msg);
      showNotification(msg, "error");
    } finally { setLoading(false); }
  };

  const toggleStatut = async (id, currentStatut, type) => {
    const newStatut = currentStatut === "ACTIF" ? "INACTIF" : "ACTIF";
    const route = type === "student" ? "etudiants" : "enseignants";
    try {
      await apiClient.patch(`/users/${route}/${id}/statut`, { statut: newStatut });
      type === "student" ? await fetchStudents() : await fetchTeachers();
      showNotification("Statut modifié");
      // Mettre à jour le drawer si ouvert
      if (selectedUser?.id === id) setSelectedUser(prev => ({ ...prev, statut: newStatut }));
    } catch { showNotification("Erreur modification statut", "error"); }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    const route = type === "student" ? "etudiants" : "enseignants";
    try {
      await apiClient.delete(`/users/${route}/${id}`);
      type === "student" ? await fetchStudents() : await fetchTeachers();
      if (selectedUser?.id === id) setSelectedUser(null);
      showNotification("Utilisateur supprimé");
    } catch { showNotification("Erreur suppression", "error"); }
  };

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
      <Notification notif={notification} />

      {/* Drawer profil */}
      {selectedUser && (
        <UserProfileDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                <p className="text-sm text-gray-500">{students.length} étudiants · {teachers.length} enseignants</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Rechercher..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-72 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <button
                onClick={() => { setFormType("student"); setOpen(true); setError(""); setForm(emptyForm); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition whitespace-nowrap">
                <UserPlus className="h-4 w-4" /> Ajouter
              </button>
              <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition" title="Actualiser">
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex gap-1 border-b border-gray-200 px-4">
            {[
              { key: "students", label: "Étudiants",   icon: GraduationCap, count: students.length },
              { key: "teachers", label: "Enseignants", icon: BookOpen,      count: teachers.length },
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

          {/* ── Tab Étudiants ── */}
          {activeTab === "students" && (
            <div className="overflow-x-auto">
              {loadingData.students ? (
                <div className="flex justify-center py-20"><Loader className="h-8 w-8 text-blue-600 animate-spin" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>{["Étudiant", "Email", "Matricule", "Filière", "Niveau", "Statut", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-20 text-gray-400">
                        {searchQuery ? "Aucun résultat" : "Aucun étudiant"}
                      </td></tr>
                    ) : filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 flex items-center gap-2.5">
                            <UserAvatar user={{ ...s, role: "ETUDIANT" }} size="sm" />
                            <span className="font-medium text-gray-800 group-hover:text-blue-600 transition">
                              {s.prenom} {s.nom}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{s.email}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{s.matricule || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.filiere_nom
                            ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">{s.filiere_nom}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {s.niveau_nom ? (
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              {s.niveau_nom}{s.cycle && <span className="ml-1 opacity-60">({s.cycle})</span>}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {s.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleStatut(s.id, s.statut, "student")}
                              className="p-1.5 rounded hover:bg-gray-100 transition"
                              title={s.statut === "ACTIF" ? "Désactiver" : "Activer"}>
                              {s.statut === "ACTIF"
                                ? <ToggleRight className="h-4 w-4 text-green-600" />
                                : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, "student")}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                              title="Supprimer">
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

          {/* ── Tab Enseignants ── */}
          {activeTab === "teachers" && (
            <div className="overflow-x-auto">
              {loadingData.teachers ? (
                <div className="flex justify-center py-20"><Loader className="h-8 w-8 text-blue-600 animate-spin" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>{["Enseignant", "Email", "Spécialité", "Grade", "Statut", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeachers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-20 text-gray-400">
                        {searchQuery ? "Aucun résultat" : "Aucun enseignant"}
                      </td></tr>
                    ) : filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          {/* ✅ Avatar cliquable avec photo */}
                          <button
                            onClick={() => setSelectedUser({ ...t, role: "ENSEIGNANT" })}
                            className="flex items-center gap-2.5 hover:opacity-80 transition group"
                          >
                            <UserAvatar user={{ ...t, role: "ENSEIGNANT" }} size="sm" />
                            <span className="font-medium text-gray-800 group-hover:text-purple-600 transition">
                              {t.prenom} {t.nom}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.email}</td>
                        <td className="px-4 py-3">
                          {t.specialite
                            ? <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">{t.specialite}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{t.grade || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {t.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedUser({ ...t, role: "ENSEIGNANT" })}
                              className="p-1.5 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition"
                              title="Voir le profil">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleStatut(t.id, t.statut, "teacher")}
                              className="p-1.5 rounded hover:bg-gray-100 transition"
                              title={t.statut === "ACTIF" ? "Désactiver" : "Activer"}>
                              {t.statut === "ACTIF"
                                ? <ToggleRight className="h-4 w-4 text-green-600" />
                                : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                            </button>
                            <button
                              onClick={() => handleDelete(t.id, "teacher")}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                              title="Supprimer">
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

      {/* ── Modal d'ajout ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-800">
                Ajouter un {formType === "student" ? "étudiant" : "enseignant"}
              </h3>
              <button onClick={() => { setOpen(false); setError(""); setForm(emptyForm); }}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {["student", "teacher"].map((type) => (
                  <button key={type} type="button"
                    onClick={() => { setFormType(type); setError(""); setForm(emptyForm); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${formType === type ? "bg-blue-700 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {type === "student" ? "Étudiant" : "Enseignant"}
                  </button>
                ))}
              </div>

              <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                Un mot de passe temporaire sera généré et envoyé par email.
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Prénom *" value={form.prenom} required onChange={(e) => setForm({ ...form, prenom: e.target.value })} className={inputClass} />
                  <input placeholder="Nom *" value={form.nom} required onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputClass} />
                </div>
                <input type="email" placeholder="Email institutionnel *" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />

                {formType === "student" ? (
                  <div>
                    <select value={form.classe_id} required onChange={(e) => setForm({ ...form, classe_id: e.target.value })} className={`${inputClass} bg-white`}>
                      <option value="">— Sélectionner une classe * —</option>
                      {loadingData.classes ? <option disabled>Chargement...</option>
                        : classes.length === 0 ? <option disabled>Aucune classe disponible</option>
                        : classes.map((c) => <option key={c.id} value={c.id}>{classeLabel(c)}</option>)}
                    </select>
                    {classes.length === 0 && !loadingData.classes && (
                      <p className="text-xs text-amber-600 mt-1">Aucune classe trouvée.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <input placeholder="Spécialité (ex: Informatique)" value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} className={inputClass} />
                    <input placeholder="Grade (ex: Maître de conférences)" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={inputClass} />
                  </>
                )}

                <button type="submit"
                  disabled={loading || (formType === "student" && classes.length === 0)}
                  className="w-full mt-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader className="h-4 w-4 animate-spin" /> Enregistrement...</>
                    : <><Mail className="h-4 w-4" /> Enregistrer et envoyer</>}
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