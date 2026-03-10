import { useEffect, useState } from "react";
import axios from "axios";
import {
  Plus,
  X,
  Trash2,
  LockKeyhole,
  CalendarDays,
  BookOpen,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader,
  Search,
  Archive,
  Check,
  Wand2,
} from "lucide-react";

const API = "http://localhost:5000/api";

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const emptyForm = { libelle: "", date_debut: "", date_fin: "" };

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const AcademicYears = () => {
  const [years, setYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    id: null,
    action: null,
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchYears();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "" }),
      3000,
    );
  };

  const fetchYears = async () => {
    setLoadingData(true);
    try {
      const res = await apiClient.get("/annees");
      setYears(res.data);
    } catch {
      showNotification("Erreur de chargement", "error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleGenerateClasses = async (id) => {
    if (
      !window.confirm(
        "Voulez-vous générer les classes ? Cette action est unique par année.",
      )
    )
      return;

    setLoading(true);
    try {
      const res = await apiClient.post(`/annees/${id}/generer-classes`);
      showNotification(res.data.message, "success");
      // On peut rafraîchir les données pour mettre à jour l'interface si nécessaire
      fetchYears();
    } catch (err) {
      // Si le backend renvoie l'erreur "déjà généré" (400), elle sera affichée ici
      const errorMsg = err.response?.data?.error || "Erreur de génération";
      showNotification(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    const { id, action } = confirmDialog;
    try {
      if (action === "cloturer")
        await apiClient.patch(`/annees/${id}/cloturer`);
      if (action === "delete") await apiClient.delete(`/annees/${id}`);
      showNotification(`Action réussie`);
      fetchYears();
    } catch {
      showNotification("Erreur", "error");
    } finally {
      setConfirmDialog({ open: false, id: null, action: null });
    }
  };

  const filtered = years.filter((y) => {
    const matchesSearch = y.libelle
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "ACTIVE" ? y.statut === "ACTIVE" : y.statut !== "ACTIVE";
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Notification */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Années académiques
              </h1>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition"
              >
                <Plus className="h-4 w-4" /> Nouvelle
              </button>
            </div>
          </div>
        </div>

        {/* Tabs & Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 px-4">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === "ACTIVE" ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500"}`}
            >
              En cours
            </button>
            <button
              onClick={() => setActiveTab("CLOTUREE")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === "CLOTUREE" ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500"}`}
            >
              Archives
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium">
                <tr>
                  <th className="px-6 py-4 text-left">Libellé</th>
                  <th className="px-6 py-4 text-left">Début</th>
                  <th className="px-6 py-4 text-left">Fin</th>
                  <th className="px-6 py-4 text-left">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((y) => (
                  <tr key={y.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {y.libelle}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(y.date_debut)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(y.date_fin)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${y.statut === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {y.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {y.statut === "ACTIVE" && (
                          <button
                            onClick={() => handleGenerateClasses(y.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Générer les classes"
                          >
                            <Wand2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              id: y.id,
                              action: "cloturer",
                            })
                          }
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <LockKeyhole className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              id: y.id,
                              action: "delete",
                            })
                          }
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
            {/* Modal & Confirm Dialog (Conservés avec le style épuré) */}     {" "}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                   {" "}
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                       {" "}
            <h3 className="font-semibold text-gray-800 mb-2">
              Confirmer l'action
            </h3>
                       {" "}
            <p className="text-sm text-gray-500 mb-6">
              Êtes-vous sûr de vouloir continuer ? Cette action peut être
              irréversible.
            </p>
                       {" "}
            <div className="flex gap-3">
                           {" "}
              <button
                onClick={() => setConfirmDialog({ open: false })}
                className="flex-1 py-2 rounded-lg border text-sm font-medium"
              >
                Annuler
              </button>
                           {" "}
              <button
                onClick={handleAction}
                className={`flex-1 py-2 rounded-lg text-white text-sm font-medium ${confirmDialog.action === "delete" ? "bg-red-600" : "bg-amber-600"}`}
              >
                Confirmer
              </button>
                         {" "}
            </div>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                   {" "}
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                       {" "}
            <div className="px-6 py-4 border-b flex justify-between items-center">
                           {" "}
              <h3 className="font-semibold">Nouvelle année académique</h3>     
                     {" "}
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
                         {" "}
            </div>
                       {" "}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                           {" "}
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                  {error}
                </div>
              )}
                           {" "}
              <div>
                               {" "}
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Libellé
                </label>
                               {" "}
                <input
                  required
                  className={inputClass}
                  value={form.libelle}
                  onChange={(e) =>
                    setForm({ ...form, libelle: e.target.value })
                  }
                  placeholder="2025-2026"
                />
                             {" "}
              </div>
                           {" "}
              <div className="grid grid-cols-2 gap-4">
                               {" "}
                <div>
                                   {" "}
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Début
                  </label>
                                   {" "}
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={form.date_debut}
                    onChange={(e) =>
                      setForm({ ...form, date_debut: e.target.value })
                    }
                  />
                               {" "}
                </div>
                               {" "}
                <div>
                                   {" "}
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Fin
                  </label>
                                   {" "}
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={form.date_fin}
                    onChange={(e) =>
                      setForm({ ...form, date_fin: e.target.value })
                    }
                  />
                                 {" "}
                </div>
                             {" "}
              </div>
                           {" "}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
              >
                               {" "}
                {loading ? "Enregistrement..." : "Enregistrer l'année"}         
                   {" "}
              </button>
                         {" "}
            </form>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
         {" "}
    </div>
  );
};

export default AcademicYears;
