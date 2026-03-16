// src/pages/Profil.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera, Pencil, Check, X, Loader, AlertCircle,
  CheckCircle, Heart, MessageCircle, Trash2,
  Calendar, RefreshCw, Send, ChevronLeft, ChevronRight,
  MoreHorizontal
} from "lucide-react";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../../lib/auth-context";

const API      = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};
const formatRelative = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `Il y a ${days}j`;
  return formatDate(d);
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ notif }) {
  if (!notif.show) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border
      ${notif.type === "success" ? "bg-white border-green-200 text-green-800" : "bg-white border-red-200 text-red-700"}`}>
      {notif.type === "success"
        ? <CheckCircle className="h-4 w-4 text-green-500" />
        : <AlertCircle className="h-4 w-4 text-red-500" />}
      {notif.message}
    </div>
  );
}

// ─── Avatar universel (photo ou initiales) ────────────────────────────────────
// ✅ Utilisé partout : profil, publications, commentaires
function UserAvatar({ user, size = "md", className = "" }) {
  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase();
  // ✅ Supporte photo_profil (profil) et photo (auteur dans publications)
  const photoUrl = fullUrl(user?.photo_profil || user?.photo);
  const sizes = {
    xs:  "w-6 h-6 text-[9px]",
    sm:  "w-8 h-8 text-xs",
    md:  "w-10 h-10 text-sm",
    lg:  "w-20 h-20 text-2xl",
    xl:  "w-28 h-28 text-3xl",
  };
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 overflow-hidden ${className}`}>
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold">
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Carrousel d'images ───────────────────────────────────────────────────────
function ImageCarousel({ images }) {
  const [current, setCurrent] = useState(0);
  if (!images || images.length === 0) return null;
  const prev = (e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); };
  return (
    <div className="px-5 pb-3">
      <div className="relative rounded-xl overflow-hidden border border-gray-100 group">
        <img src={fullUrl(images[current]?.url)} alt="" className="w-full max-h-96 object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === current ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Carte Publication ────────────────────────────────────────────────────────
function PublicationCard({ pub, currentUserId, onDelete, onLike, onCommentAdded }) {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]       = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingCom, setLoadingCom]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // ✅ isLiked : comparaison Number pour éviter "3" !== 3
  const isLiked = pub.likes?.map(Number).includes(Number(currentUserId));

  const loadComments = async () => {
    setLoadingCom(true);
    try {
      const res = await apiClient.get(`/publications/${pub.id}/commentaires`);
      setComments(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingCom(false); }
  };

  const toggleComments = () => {
    if (!showComments && comments.length === 0) loadComments();
    setShowComments((v) => !v);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/publications/${pub.id}/commentaires`, { contenu: commentText });
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
      onCommentAdded?.(pub.id);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {/* ✅ Avatar avec photo de profil de l'auteur */}
          <UserAvatar user={pub} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-800">{pub.prenom} {pub.nom}</p>
            <p className="text-xs text-gray-400">{formatRelative(pub.created_at)}</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border rounded-xl shadow-lg z-10 w-36 overflow-hidden">
              <button
                onClick={() => { onDelete(pub.id); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      {pub.contenu && (
        <div className="px-5 pb-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{pub.contenu}</p>
        </div>
      )}

      {/* Images */}
      <ImageCarousel images={pub.images} />

      {/* Actions */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-50">
        <button
          onClick={() => onLike(pub.id)}
          className={`flex items-center gap-1.5 text-sm font-medium transition ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}>
          <Heart className={`h-4 w-4 transition ${isLiked ? "fill-red-500" : ""}`} />
          {pub.likes_count || 0}
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 text-sm transition ${showComments ? "text-indigo-500" : "text-gray-400 hover:text-indigo-400"}`}>
          <MessageCircle className="h-4 w-4" />
          {pub.commentaires_count || 0}
        </button>
        <span className="ml-auto text-xs text-gray-300">{formatDate(pub.created_at)}</span>
      </div>

      {/* Commentaires */}
      {showComments && (
        <div className="px-5 py-4 bg-slate-50 border-t border-gray-50 space-y-3">
          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {loadingCom ? (
              <div className="flex justify-center py-3"><Loader className="h-4 w-4 animate-spin text-indigo-400" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Aucun commentaire</p>
            ) : (
              comments.map((com) => (
                <div key={com.id} className="flex gap-2">
                  {/* ✅ Photo de profil dans les commentaires */}
                  <UserAvatar user={com} size="sm" />
                  <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border shadow-sm flex-1">
                    <p className="text-[11px] font-bold text-gray-900">{com.prenom} {com.nom}</p>
                    <p className="text-sm text-gray-600">{com.contenu}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Commenter..."
              className="flex-1 bg-white border rounded-full px-4 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="p-2 bg-indigo-600 text-white rounded-full disabled:opacity-40 hover:bg-indigo-700 transition">
              {submitting ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────
export default function Profil() {
  const { user: authUser, updateUser } = useAuth();
  const socket = useSocket();

  const [profile, setProfile]           = useState(null);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingPubs, setLoadingPubs]   = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [formNom, setFormNom]           = useState("");
  const [formPrenom, setFormPrenom]     = useState("");
  const [savingInfo, setSavingInfo]     = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notif, setNotif] = useState({ show: false, message: "", type: "success" });

  const photoInputRef = useRef(null);

  const toast = (message, type = "success") => {
    setNotif({ show: true, message, type });
    setTimeout(() => setNotif({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.get("/profil");
      setProfile(res.data);
      setFormNom(res.data.nom);
      setFormPrenom(res.data.prenom);
    } catch { toast("Erreur chargement profil", "error"); }
  }, []);

  const fetchPublications = useCallback(async () => {
    setLoadingPubs(true);
    try {
      const res = await apiClient.get("/profil/publications");
      setPublications(res.data || []);
    } catch { toast("Erreur chargement publications", "error"); }
    finally { setLoadingPubs(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchPublications()]);
      setLoading(false);
    })();
  }, [fetchProfile, fetchPublications]);

  // ─── Socket : likes, commentaires, mise à jour utilisateurs ──────────────
  useEffect(() => {
    if (!socket) return;

    // ✅ Likes en temps réel
    const onLikes = ({ pubId, nb_likes, userId, liked }) => {
      setPublications((prev) => prev.map((p) => {
        if (p.id !== pubId) return p;
        let newLikes = [...(p.likes || [])].map(Number);
        if (liked) { if (!newLikes.includes(Number(userId))) newLikes.push(Number(userId)); }
        else { newLikes = newLikes.filter((id) => id !== Number(userId)); }
        return { ...p, likes: newLikes, likes_count: nb_likes };
      }));
    };

    // ✅ Nouveaux commentaires en temps réel
    const onNewComment = ({ pubId, comment }) => {
      setPublications((prev) => prev.map((p) =>
        p.id !== pubId ? p : { ...p, commentaires_count: (p.commentaires_count || 0) + 1 }
      ));
    };

    // ✅ Suppression commentaire
    const onDeleteComment = ({ pubId }) => {
      setPublications((prev) => prev.map((p) =>
        p.id !== pubId ? p : { ...p, commentaires_count: Math.max((p.commentaires_count || 1) - 1, 0) }
      ));
    };

    // ✅ Photo/nom mis à jour par un autre utilisateur → mettre à jour dans les publications
    const onUserUpdated = ({ id, nom, prenom, photo_profil }) => {
      // Mettre à jour dans les publications affichées
      setPublications((prev) => prev.map((p) => {
        if (Number(p.auteur_id) !== Number(id)) return p;
        return {
          ...p,
          ...(nom        && { nom }),
          ...(prenom     && { prenom }),
          ...(photo_profil && { photo_profil }),
        };
      }));
      // Si c'est le profil courant, mettre à jour aussi
      if (Number(id) === Number(authUser?.id)) {
        setProfile((prev) => prev ? {
          ...prev,
          ...(nom        && { nom }),
          ...(prenom     && { prenom }),
          ...(photo_profil && { photo_profil }),
        } : prev);
      }
    };

    socket.on("update_likes",    onLikes);
    socket.on("new_comment",     onNewComment);
    socket.on("delete_comment",  onDeleteComment);
    socket.on("userUpdated",     onUserUpdated);

    return () => {
      socket.off("update_likes",   onLikes);
      socket.off("new_comment",    onNewComment);
      socket.off("delete_comment", onDeleteComment);
      socket.off("userUpdated",    onUserUpdated);
    };
  }, [socket, authUser?.id]);

  // ─── Sauvegarder nom/prénom ───────────────────────────────────────────────
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      await apiClient.patch("/profil", { nom: formNom, prenom: formPrenom });
      setProfile((p) => ({ ...p, nom: formNom, prenom: formPrenom }));
      updateUser?.({ ...authUser, nom: formNom, prenom: formPrenom });
      // ✅ Mettre à jour le localStorage pour que le reste de l'app suive
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, nom: formNom, prenom: formPrenom }));
      setEditMode(false);
      toast("Profil mis à jour");
    } catch { toast("Erreur mise à jour", "error"); }
    finally { setSavingInfo(false); }
  };

  // ─── Changer la photo ─────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const res = await apiClient.patch("/profil/photo", fd);
      const newPhoto = res.data.photo_profil;
      setProfile((p) => ({ ...p, photo_profil: newPhoto }));
      updateUser?.({ ...authUser, photo_profil: newPhoto });
      // ✅ Mettre à jour le localStorage → photo visible partout immédiatement
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, photo_profil: newPhoto }));
      // ✅ Mettre à jour les publications déjà affichées (auteur = moi)
      setPublications((prev) => prev.map((p) =>
        Number(p.auteur_id) === Number(authUser?.id) ? { ...p, photo_profil: newPhoto } : p
      ));
      toast("Photo mise à jour");
    } catch { toast("Erreur upload photo", "error"); }
    finally { setUploadingPhoto(false); }
  };

  // ─── Liker une publication ────────────────────────────────────────────────
  const handleLike = async (pubId) => {
    try {
      await apiClient.post(`/publications/${pubId}/like`);
      // L'update viendra via socket "update_likes"
    } catch (e) { console.error(e); }
  };

  // ─── Supprimer une publication ────────────────────────────────────────────
  const handleDelete = async (pubId) => {
    try {
      await apiClient.delete(`/publications/${pubId}`);
      setPublications((prev) => prev.filter((p) => p.id !== pubId));
      toast("Publication supprimée");
    } catch { toast("Erreur suppression", "error"); }
  };

  // ─── Incrémenter commentaires_count localement ───────────────────────────
  const handleCommentAdded = (pubId) => {
    setPublications((prev) => prev.map((p) =>
      p.id === pubId ? { ...p, commentaires_count: (p.commentaires_count || 0) + 1 } : p
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="animate-spin text-indigo-500 h-8 w-8" />
      </div>
    );
  }

  const ROLE_COLORS = {
    ETUDIANT:   "bg-emerald-100 text-emerald-700",
    ENSEIGNANT: "bg-amber-100 text-amber-700",
    ADMIN:      "bg-indigo-100 text-indigo-700",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <Toast notif={notif} />
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Carte profil ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-indigo-600 to-sky-500" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">

              {/* Avatar + bouton photo */}
              <div className="relative group">
                <UserAvatar
                  user={profile}
                  size="xl"
                  className="ring-4 ring-white shadow-lg"
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  {uploadingPhoto
                    ? <Loader className="animate-spin text-white h-6 w-6" />
                    : <Camera className="text-white h-6 w-6" />
                  }
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Boutons modifier / enregistrer */}
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center gap-1.5">
                  <Pencil className="h-4 w-4" /> Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditMode(false); setFormNom(profile.nom); setFormPrenom(profile.prenom); }}
                    className="px-3 py-2 border rounded-xl text-sm hover:bg-gray-50 transition">
                    Annuler
                  </button>
                  <button
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-1.5 transition">
                    {savingInfo ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Enregistrer
                  </button>
                </div>
              )}
            </div>

            {/* Infos ou formulaire */}
            {editMode ? (
              <div className="space-y-3 max-w-sm">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prénom</label>
                  <input
                    value={formPrenom}
                    onChange={(e) => setFormPrenom(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                  <input
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900">{profile?.prenom} {profile?.nom}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[profile?.role]}`}>
                    {profile?.role}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{profile?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Publications ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">
              Mes publications
              {publications.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({publications.length})</span>
              )}
            </h3>
            <button
              onClick={fetchPublications}
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600 transition">
              <RefreshCw className={`h-3 w-3 ${loadingPubs ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          {loadingPubs ? (
            <div className="flex justify-center py-10">
              <Loader className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : publications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-gray-100 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <MessageCircle className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Aucune publication</p>
              <p className="text-sm text-gray-400 mt-1">Vos publications apparaîtront ici</p>
            </div>
          ) : (
            publications.map((p) => (
              <PublicationCard
                key={p.id}
                pub={p}
                currentUserId={authUser?.id}
                onDelete={handleDelete}
                onLike={handleLike}
                onCommentAdded={handleCommentAdded}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}