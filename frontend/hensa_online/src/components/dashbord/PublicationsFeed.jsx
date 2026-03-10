// src/components/PublicationsFeed.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, MessageCircle, Send, ImagePlus, X,
  ChevronDown, ChevronUp, Loader, Trash2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import axios from "axios";

const API      = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000"; // ✅ pour les images
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (prenom = "", nom = "") =>
  `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();

const formatRelativeTime = (dateStr) => {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "à l'instant";
  if (mins  < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days  <  7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const ROLE_STYLE = {
  ETUDIANT:   "bg-green-100 text-green-700",
  ENSEIGNANT: "bg-yellow-100 text-yellow-700",
  ADMIN:      "bg-blue-100 text-blue-700",
};
const ROLE_LABEL = { ETUDIANT: "Étudiant", ENSEIGNANT: "Enseignant", ADMIN: "Admin" };

// ─── Carrousel d'images ───────────────────────────────────────────────────────
function ImageCarousel({ images }) {
  const [current, setCurrent] = useState(0);
  if (!images || images.length === 0) return null;

  const prev = (e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); };

  return (
    <div className="relative px-4 pb-3">
      <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 relative">
        <img
          src={images[current]?.startsWith("http") ? images[current] : `${BASE_URL}${images[current]}`}
          alt={`Image ${current + 1}`}
          className="w-full max-h-96 object-cover"
        />

        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* Indicateurs */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition ${i === current ? "bg-white w-3" : "bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Miniatures si plusieurs images */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                i === current ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={url?.startsWith("http") ? url : `${BASE_URL}${url}`} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────
function Composer({ user, onPublish }) {
  const [content, setContent]       = useState("");
  const [images, setImages]         = useState([]); // [{ preview, file }]
  const [focused, setFocused]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const MAX_IMAGES = 5;

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    toAdd.forEach((file) => {
      const preview = URL.createObjectURL(file); // ✅ URL locale pour l'aperçu
      setImages((prev) => {
        if (prev.length >= MAX_IMAGES) return prev;
        return [...prev, { preview, file }]; // ✅ garder le File réel
      });
    });

    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onPublish(content.trim(), images.map((img) => img.file));
      setContent("");
      setImages([]);
      setFocused(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {getInitials(user.prenom, user.nom)}
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            placeholder="Partagez quelque chose avec la communauté..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            rows={focused || content ? 3 : 1}
            className="w-full resize-none border-0 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
          />

          {/* Aperçus des images sélectionnées */}
          {images.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Bouton ajouter plus */}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 transition flex-shrink-0"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] mt-1">{MAX_IMAGES - images.length} restant{MAX_IMAGES - images.length > 1 ? "s" : ""}</span>
                </button>
              )}
            </div>
          )}

          {/* ✅ Input toujours monté dans le DOM — jamais conditionnel */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImages}
          />

          {(focused || content) && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ImagePlus className="h-4 w-4" />
                <span className="text-xs">
                  {images.length === 0
                    ? "Photos"
                    : `${images.length}/${MAX_IMAGES} photo${images.length > 1 ? "s" : ""}`}
                </span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-full transition"
              >
                {submitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Publier
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Publication Card ──────────────────────────────────────────────────────────
function PublicationCard({ pub, user, onLike, onComment, onDelete, onDeleteComment }) {
  const [showComments, setShowComments]   = useState(false);
  const [comments, setComments]           = useState([]);
  const [loadingCom, setLoadingCom]       = useState(false);
  const [commentText, setCommentText]     = useState("");
  const [likeAnim, setLikeAnim]           = useState(false);
  const [submittingCom, setSubmittingCom] = useState(false);

  const isAuthor = pub.auteur_id === user.id;

  const toggleComments = async () => {
    if (!showComments && comments.length === 0 && pub.nb_commentaires > 0) {
      setLoadingCom(true);
      try {
        const res = await apiClient.get(`/publications/${pub.id}/commentaires`);
        setComments(res.data || []);
      } catch (e) { console.error(e); }
      finally { setLoadingCom(false); }
    }
    setShowComments((prev) => !prev);
  };

  // Exposer pour mise à jour temps réel depuis le parent
  pub._addComment    = useCallback((c) => setComments((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c]), []);
  pub._removeComment = useCallback((id) => setComments((prev) => prev.filter((c) => c.id !== id)), []);

  const handleLike = () => {
    setLikeAnim(true);
    onLike(pub.id);
    setTimeout(() => setLikeAnim(false), 300);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingCom(true);
    try {
      await onComment(pub.id, commentText.trim());
      setCommentText("");
      setShowComments(true);
    } finally {
      setSubmittingCom(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(pub.prenom, pub.nom)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {pub.prenom} {pub.nom}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${ROLE_STYLE[pub.auteur_role] ?? "bg-gray-100 text-gray-600"}`}>
                {ROLE_LABEL[pub.auteur_role] ?? pub.auteur_role}
              </span>
            </div>
            <span className="text-xs text-gray-400">{formatRelativeTime(pub.created_at)}</span>
          </div>
        </div>
        {isAuthor && (
          <button onClick={() => onDelete(pub.id)} className="text-gray-300 hover:text-red-500 transition p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Contenu */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
          {pub.contenu}
        </p>
      </div>

      {/* ✅ Carrousel multi-images */}
      <ImageCarousel images={pub.images} />

      {/* Compteurs */}
      {(pub.nb_likes > 0 || pub.nb_commentaires > 0) && (
        <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-400">
          {pub.nb_likes > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 fill-red-500 text-red-500" />
              {pub.nb_likes} j'aime{pub.nb_likes > 1 ? "s" : ""}
            </span>
          )}
          {pub.nb_commentaires > 0 && (
            <button onClick={toggleComments} className="hover:text-gray-600 transition ml-auto">
              {pub.nb_commentaires} commentaire{pub.nb_commentaires > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      <div className="border-t border-gray-100 dark:border-gray-800" />

      {/* Actions */}
      <div className="flex items-center px-2 py-1">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
            pub.liked_by_me
              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Heart className={`h-4 w-4 transition-transform ${pub.liked_by_me ? "fill-current" : ""} ${likeAnim ? "scale-125" : ""}`} />
          J'aime
        </button>
        <button
          onClick={toggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <MessageCircle className="h-4 w-4" />
          Commenter
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <div className="px-4 py-3 space-y-2">
            {loadingCom ? (
              <div className="flex justify-center py-4">
                <Loader className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 group">
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {getInitials(c.prenom, c.nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800 dark:text-white">{c.prenom} {c.nom}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase ${ROLE_STYLE[c.auteur_role] ?? "bg-gray-100 text-gray-600"}`}>
                          {ROLE_LABEL[c.auteur_role] ?? c.auteur_role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{c.contenu}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 pl-3">
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {c.auteur_id === user.id && (
                        <button
                          onClick={() => onDeleteComment(pub.id, c.id)}
                          className="text-[10px] text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Saisie commentaire */}
            <div className="flex gap-2.5 items-center pt-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {getInitials(user.prenom, user.nom)}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Écrire un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 border-0"
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || submittingCom}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white transition flex-shrink-0"
                >
                  {submittingCom ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Feed principal ────────────────────────────────────────────────────────────
export default function PublicationsFeed() {
  const socket = useSocket();
  const user   = JSON.parse(localStorage.getItem("user") || "{}");

  const [publications, setPublications] = useState([]);
  const [loading, setLoading]           = useState(true);

  const canPublish = ["ETUDIANT", "ADMIN"].includes(user?.role);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/publications");
        setPublications(res.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // ─── Socket.IO temps réel ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onNewPub     = (pub)              => setPublications((prev) => prev.some((p) => p.id === pub.id) ? prev : [{ ...pub, images: pub.images || [] }, ...prev]);
    const onDeletePub  = ({ id })           => setPublications((prev) => prev.filter((p) => p.id !== id));
    const onUpdateLikes = ({ pubId, nb_likes, userId, liked }) =>
      setPublications((prev) => prev.map((p) => p.id !== pubId ? p : {
        ...p, nb_likes,
        liked_by_me: userId === user.id ? liked : p.liked_by_me,
      }));
    const onNewComment = ({ pubId, comment }) =>
      setPublications((prev) => prev.map((p) => {
        if (p.id !== pubId) return p;
        if (p._addComment) p._addComment(comment);
        return { ...p, nb_commentaires: (p.nb_commentaires || 0) + 1 };
      }));
    const onDeleteComment = ({ pubId, comId }) =>
      setPublications((prev) => prev.map((p) => {
        if (p.id !== pubId) return p;
        if (p._removeComment) p._removeComment(comId);
        return { ...p, nb_commentaires: Math.max(0, (p.nb_commentaires || 1) - 1) };
      }));

    socket.on("new_publication",    onNewPub);
    socket.on("delete_publication", onDeletePub);
    socket.on("update_likes",       onUpdateLikes);
    socket.on("new_comment",        onNewComment);
    socket.on("delete_comment",     onDeleteComment);

    return () => {
      socket.off("new_publication",    onNewPub);
      socket.off("delete_publication", onDeletePub);
      socket.off("update_likes",       onUpdateLikes);
      socket.off("new_comment",        onNewComment);
      socket.off("delete_comment",     onDeleteComment);
    };
  }, [socket, user.id]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handlePublish = async (contenu, imageFiles) => {
    // ✅ FormData pour envoyer les fichiers réels (pas base64)
    const formData = new FormData();
    formData.append("contenu", contenu);
    imageFiles.forEach((file) => formData.append("images", file));
    await apiClient.post("/publications", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleLike = async (pubId) => {
    try { await apiClient.post(`/publications/${pubId}/like`); }
    catch (e) { console.error(e); }
  };

  const handleComment = async (pubId, contenu) => {
    try { await apiClient.post(`/publications/${pubId}/commentaires`, { contenu }); }
    catch (e) { console.error(e); }
  };

  const handleDelete = async (pubId) => {
    try { await apiClient.delete(`/publications/${pubId}`); }
    catch (e) { console.error(e); }
  };

  const handleDeleteComment = async (pubId, comId) => {
    try { await apiClient.delete(`/publications/${pubId}/commentaires/${comId}`); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Container d'ajout fixe en haut */}
      {canPublish && (
        <div className="flex-none px-4 pt-4 pb-2 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-2xl mx-auto w-full">
            <Composer user={user} onPublish={handlePublish} />
          </div>
        </div>
      )}

      {/* Zone de contenu scrollable */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="max-w-2xl mx-auto py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : publications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Aucune publication pour le moment.</p>
              <p className="text-gray-400 text-xs mt-1">Soyez le premier à partager quelque chose !</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {publications.map((pub) => (
                <PublicationCard
                  key={pub.id}
                  pub={pub}
                  user={user}
                  onLike={handleLike}
                  onComment={handleComment}
                  onDelete={handleDelete}
                  onDeleteComment={handleDeleteComment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}