// src/pages/UserProfil.jsx
// Page de profil PUBLIC d'un utilisateur (consulté par les autres)
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Heart, MessageCircle, Loader, ChevronLeft,
  ChevronRight, Send, GraduationCap, BookOpen, Hash,
  Award, Mail, Calendar, MoreHorizontal, Trash2
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

const fullUrl = (url) =>
  !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;

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

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = "md", className = "" }) {
  const [imgError, setImgError] = useState(false);
  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase();
  const photoUrl = fullUrl(user?.photo_profil || user?.photo);
  const sizes = { xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-20 h-20 text-2xl", xl: "w-28 h-28 text-3xl" };
  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 overflow-hidden ${className}`}>
      {photoUrl && !imgError ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold">
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Carrousel ────────────────────────────────────────────────────────────────
function ImageCarousel({ images }) {
  const [current, setCurrent] = useState(0);
  if (!images?.length) return null;
  return (
    <div className="px-5 pb-3">
      <div className="relative rounded-xl overflow-hidden border border-gray-100 group">
        <img src={fullUrl(images[current]?.url)} alt="" className="w-full max-h-96 object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Carte Publication ────────────────────────────────────────────────────────
function PublicationCard({ pub, currentUserId, onLike, onCommentAdded }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [loadingCom, setLoadingCom]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const isLiked = pub.likes?.map(Number).includes(Number(currentUserId));

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingCom(true);
      try {
        const res = await apiClient.get(`/publications/${pub.id}/commentaires`);
        setComments(res.data || []);
      } catch (e) { console.error(e); }
      finally { setLoadingCom(false); }
    }
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
      <div className="flex items-center gap-3 px-5 py-4">
        <UserAvatar user={pub} size="sm" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{pub.prenom} {pub.nom}</p>
          <p className="text-xs text-gray-400">{formatRelative(pub.created_at)}</p>
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
        <button onClick={() => onLike(pub.id)}
          className={`flex items-center gap-1.5 text-sm font-medium transition ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}>
          <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500" : ""}`} />
          {pub.likes_count || 0}
        </button>
        <button onClick={toggleComments}
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
            ) : comments.map((com) => (
              <div key={com.id} className="flex gap-2">
                <UserAvatar user={com} size="sm" />
                <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border shadow-sm flex-1">
                  <p className="text-[11px] font-bold text-gray-900">{com.prenom} {com.nom}</p>
                  <p className="text-sm text-gray-600">{com.contenu}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Commenter..."
              className="flex-1 bg-white border rounded-full px-4 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            <button type="submit" disabled={!commentText.trim() || submitting}
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
// Props : userId (number|string), onBack (fonction)
export default function UserProfil({ userId, onBack }) {
  const { user: currentUser } = useAuth();
  const socket = useSocket();

  const [profile, setProfile]           = useState(null);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingPubs, setLoadingPubs]   = useState(false);

  const ROLE_COLORS = {
    ETUDIANT:   "bg-emerald-100 text-emerald-700",
    ENSEIGNANT: "bg-amber-100 text-amber-700",
    ADMIN:      "bg-indigo-100 text-indigo-700",
  };
  const ROLE_LABELS = {
    ETUDIANT: "Étudiant", ENSEIGNANT: "Enseignant", ADMIN: "Admin",
  };

  // Charger le profil + publications
  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.get(`/users/${userId}`);
      setProfile(res.data);
    } catch (e) { console.error(e); }
  }, [userId]);

  const fetchPublications = useCallback(async () => {
    setLoadingPubs(true);
    try {
      // Récupérer toutes les publications et filtrer par auteur
      const res = await apiClient.get("/publications");
      const pubs = (res.data || []).filter(
        (p) => Number(p.auteur_id) === Number(userId)
      );
      setPublications(pubs);
    } catch (e) { console.error(e); }
    finally { setLoadingPubs(false); }
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchPublications()]);
      setLoading(false);
    })();
  }, [fetchProfile, fetchPublications]);

  // ─── Socket : likes en temps réel ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onLikes = ({ pubId, nb_likes, userId: likerId, liked }) => {
      setPublications((prev) => prev.map((p) => {
        if (p.id !== pubId) return p;
        let likes = [...(p.likes || [])].map(Number);
        if (liked) { if (!likes.includes(Number(likerId))) likes.push(Number(likerId)); }
        else likes = likes.filter((id) => id !== Number(likerId));
        return { ...p, likes, likes_count: nb_likes };
      }));
    };

    const onNewComment = ({ pubId }) => {
      setPublications((prev) => prev.map((p) =>
        p.id === pubId ? { ...p, commentaires_count: (p.commentaires_count || 0) + 1 } : p
      ));
    };

    // Photo/nom mis à jour
    const onUserUpdated = ({ id, nom, prenom, photo_profil }) => {
      if (Number(id) === Number(userId)) {
        setProfile((prev) => prev ? {
          ...prev,
          ...(nom          && { nom }),
          ...(prenom       && { prenom }),
          ...(photo_profil && { photo_profil }),
        } : prev);
      }
    };

    socket.on("update_likes",  onLikes);
    socket.on("new_comment",   onNewComment);
    socket.on("userUpdated",   onUserUpdated);
    return () => {
      socket.off("update_likes",  onLikes);
      socket.off("new_comment",   onNewComment);
      socket.off("userUpdated",   onUserUpdated);
    };
  }, [socket, userId]);

  const handleLike = async (pubId) => {
    try { await apiClient.post(`/publications/${pubId}/like`); }
    catch (e) { console.error(e); }
  };

  const handleCommentAdded = (pubId) => {
    setPublications((prev) => prev.map((p) =>
      p.id === pubId ? { ...p, commentaires_count: (p.commentaires_count || 0) + 1 } : p
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <p className="text-gray-500">Profil introuvable</p>
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
      </div>
    );
  }

  const isOwnProfile = Number(currentUser?.id) === Number(userId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour
        </button>

        {/* ── Carte profil ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Bandeau */}
          <div className="h-28 bg-gradient-to-r from-indigo-600 to-sky-500" />

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <UserAvatar
                user={profile}
                size="xl"
                className="ring-4 ring-white shadow-lg"
              />
              {isOwnProfile && (
                <span className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-xl font-medium border border-indigo-100">
                  C'est votre profil
                </span>
              )}
            </div>

            {/* Nom + rôle */}
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">{profile.prenom} {profile.nom}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[profile.role]}`}>
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />{profile.email}
            </p>

            {/* Infos spécifiques */}
            {(profile.matricule || profile.filiere_nom || profile.niveau_nom ||
              profile.specialite || profile.grade) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.matricule && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium">
                    <Hash className="h-3.5 w-3.5" />{profile.matricule}
                  </span>
                )}
                {profile.filiere_nom && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-medium">
                    <BookOpen className="h-3.5 w-3.5" />{profile.filiere_nom}
                  </span>
                )}
                {profile.niveau_nom && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-medium">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {profile.niveau_nom}{profile.cycle ? ` (${profile.cycle})` : ""}
                  </span>
                )}
                {profile.specialite && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 text-xs font-medium">
                    <BookOpen className="h-3.5 w-3.5" />{profile.specialite}
                  </span>
                )}
                {profile.grade && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium">
                    <Award className="h-3.5 w-3.5" />{profile.grade}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Publications ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">
              Publications
              {publications.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({publications.length})</span>
              )}
            </h3>
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
              <p className="text-sm text-gray-400 mt-1">Cet utilisateur n'a pas encore publié</p>
            </div>
          ) : (
            publications.map((p) => (
              <PublicationCard
                key={p.id}
                pub={p}
                currentUserId={currentUser?.id}
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