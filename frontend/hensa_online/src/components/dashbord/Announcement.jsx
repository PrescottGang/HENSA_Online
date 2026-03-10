import { useState, useEffect } from "react";
import { Megaphone, Plus, Calendar, Loader, Trash2, AlertCircle } from "lucide-react";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";

const API = "http://localhost:5000/api";

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const emptyForm = { title: "", content: "", audience: "Tous", priority: "normal" };

export default function Announcement() {

  // ✅ Récupérer l'utilisateur connecté pour vérifier le rôle
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "ADMIN";
  const socket = useSocket(); // ✅ Connexion socket

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [open, setOpen]                   = useState(false);
  const [form, setForm]                   = useState(emptyForm);
  const [error, setError]                 = useState("");

  // Chargement initial
  useEffect(() => { fetchAnnouncements(); }, []);

  useEffect(() => {
    if (!socket) return;

    // ✅ Fonctions nommées — chaque composant retire uniquement son propre listener
    const handleNew = (announcement) => {
      setAnnouncements((prev) => {
        const exists = prev.some((a) => a.id === announcement.id);
        if (exists) return prev;
        return [announcement, ...prev];
      });
    };

    const handleDelete = ({ id }) => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    };

    socket.on("new_announcement", handleNew);
    socket.on("delete_announcement", handleDelete);

    return () => {
      // ✅ On retire uniquement ce listener-ci, pas ceux des autres composants
      socket.off("new_announcement", handleNew);
      socket.off("delete_announcement", handleDelete);
    };
  }, [socket]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/announcements");
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des annonces.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAdmin) return; // ✅ Sécurité côté frontend
    if (!form.title.trim() || !form.content.trim()) {
      setError("Titre et contenu requis.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await apiClient.post("/announcements", form);

      // ✅ Extraire l'annonce depuis la réponse
      const newAnnouncement = res.data?.announcement ?? res.data;

      if (newAnnouncement && newAnnouncement.id) {
        // ✅ Mise à jour immédiate de la liste côté admin sans rechargement
      
      } else {
        // Fallback : recharger depuis le serveur si la réponse est inattendue
        await fetchAnnouncements();
      }

      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return; // ✅ Sécurité côté frontend
    if (!window.confirm("Supprimer cette annonce ?")) return;
    try {
      await apiClient.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression.");
    }
  };

  const closeModal = () => {
    setOpen(false);
    setForm(emptyForm);
    setError("");
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Annonces officielles</h3>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? "Gérez les communications officielles de l'université."
              : "Consultez les communications officielles de l'université."}
          </p>
        </div>

        {/* ✅ Bouton visible uniquement pour l'admin */}
        {isAdmin && (
          <button
            onClick={() => { setError(""); setOpen(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Nouvelle annonce
          </button>
        )}
      </div>

      {/* Modal — admin uniquement */}
      {open && isAdmin && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-lg rounded-xl p-6 space-y-4 mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">Créer une annonce</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Titre</label>
              <input
                className="w-full border border-gray-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre de l'annonce"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Contenu</label>
              <textarea
                rows="4"
                className="w-full border border-gray-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Rédigez votre annonce..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Destinataires</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                >
                  <option value="Tous">Tous</option>
                  <option value="Etudiants">Etudiants</option>
                  <option value="Enseignants">Enseignants</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Priorité</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader className="animate-spin h-4 w-4" /> Publication...</>
                ) : (
                  "Publier l'annonce"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.length === 0 && (
            <div className="text-center text-gray-400 py-16 text-sm">
              Aucune annonce publiée
            </div>
          )}

          {announcements.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-sm transition">

              <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${
                a.priority === "high" ? "bg-red-100" : "bg-blue-100"
              }`}>
                <Megaphone className={`h-5 w-5 ${a.priority === "high" ? "text-red-600" : "text-blue-600"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <h4 className="font-semibold text-sm text-gray-800">{a.title}</h4>
                    {a.priority === "high" && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Urgent
                      </span>
                    )}
                    <span className="text-[10px] border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {a.audience}
                    </span>
                  </div>

                  {/* ✅ Bouton supprimer visible uniquement pour l'admin */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.content}</p>

                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Calendar className="h-3 w-3" />
                  {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric"
                  }) : "À l'instant"}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}