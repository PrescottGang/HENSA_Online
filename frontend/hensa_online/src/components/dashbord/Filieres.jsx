import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, X, Trash2, BookOpen, Search, 
  RefreshCw, Loader, CheckCircle, AlertCircle,
  LayoutGrid, List
} from "lucide-react";

const API = "http://localhost:5000/api";

const Filieres = () => {
  const [filieres, setFilieres] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [nom, setNom] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    fetchFilieres();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const fetchFilieres = async () => {
    setLoadingData(true);
    try {
      const res = await axios.get(`${API}/filieres`);
      setFilieres(res.data);
    } catch (error) {
      showNotification("Erreur lors du chargement des filières", "error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/filieres`, { nom });
      setNom("");
      setOpen(false);
      fetchFilieres();
      showNotification("Filière ajoutée avec succès !");
    } catch (error) {
      showNotification(error.response?.data?.message || "Erreur lors de l'ajout", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette filière ? cette action est irréversible.")) return;
    try {
      await axios.delete(`${API}/filieres/${id}`);
      fetchFilieres();
      showNotification("Filière supprimée");
    } catch (error) {
      showNotification("Erreur lors de la suppression", "error");
    }
  };

  const filteredFilieres = filieres.filter((f) =>
    f.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClass = "px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition w-full";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            notification.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {notification.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {notification.message}
          </div>
        )}

        {/* HEADER*/}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LayoutGrid className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des filières</h1>
                <p className="text-sm text-gray-500">
                  {filieres.length} filière{filieres.length > 1 ? 's' : ''} enregistrée{filieres.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une filière..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-80 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> Nouvelle
              </button>
              <button onClick={fetchFilieres} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <RefreshCw className={`h-4 w-4 text-gray-600 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* TABS (Identique à AnneeAcademique) */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex gap-1 border-b border-gray-200 px-4">
            <button 
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === "all" ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="h-4 w-4" />
              Toutes les filières
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === "all" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                {filieres.length}
              </span>
            </button>
          </div>

          {/* TABLE (Style AnneeAcademique/Users) */}
          <div className="overflow-x-auto">
            {loadingData ? (
              <div className="flex items-center justify-center py-20">
                <Loader className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Nom de la filière</th>
                    <th className="px-6 py-3 text-left font-medium">Date de création</th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFilieres.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-20 text-gray-400">
                        {searchQuery ? "Aucun résultat trouvé" : "Aucune filière trouvée"}
                      </td>
                    </tr>
                  ) : (
                    filteredFilieres.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold">
                              {f.nom.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800">{f.nom}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {/* Simulation de date si non présente dans votre DB */}
                          Ajouté récemment
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL*/}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Nouvelle filière</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Nom de la filière
                </label>
                <input 
                  required 
                  className={inputClass} 
                  value={nom} 
                  onChange={e => setNom(e.target.value)} 
                  placeholder="Ex: Informatique de gestion" 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Enregistrer la filière
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Filieres;