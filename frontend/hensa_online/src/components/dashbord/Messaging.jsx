// src/components/Messaging.jsx
import { useState, useEffect, useRef } from "react";
import {
  Send, X, Search, Users, Lock, Smile, Paperclip,
  ChevronLeft, Loader, Trash2, CheckCheck, Check,
  UserPlus, FileText, Download, FileSpreadsheet, File
} from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import axios from "axios";

const API      = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";

const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (p = "", n = "") => `${p[0] ?? ""}${n[0] ?? ""}`.toUpperCase();

const formatTime = (d) => {
  if (!d) return "";
  const dt   = new Date(d);
  const diff = Date.now() - dt;
  if (diff < 86400000)  return dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return dt.toLocaleDateString("fr-FR", { weekday: "short" });
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const fullUrl = (url) => !url ? "" : url.startsWith("http") ? url : `${BASE_URL}${url}`;

const ROLE_COLORS = { ETUDIANT: "bg-green-500", ENSEIGNANT: "bg-yellow-500", ADMIN: "bg-blue-500" };

// ─── Icônes fichiers ──────────────────────────────────────────────────────────
const FILE_META = {
  pdf:  { Icon: FileText,        color: "text-red-500",    bg: "bg-red-50"    },
  doc:  { Icon: FileText,        color: "text-blue-600",   bg: "bg-blue-50"   },
  docx: { Icon: FileText,        color: "text-blue-600",   bg: "bg-blue-50"   },
  xls:  { Icon: FileSpreadsheet, color: "text-green-600",  bg: "bg-green-50"  },
  xlsx: { Icon: FileSpreadsheet, color: "text-green-600",  bg: "bg-green-50"  },
  ppt:  { Icon: File,            color: "text-orange-500", bg: "bg-orange-50" },
  pptx: { Icon: File,            color: "text-orange-500", bg: "bg-orange-50" },
};
const fileMeta = (nom = "") => FILE_META[nom.split(".").pop()?.toLowerCase()] ?? { Icon: File, color: "text-gray-500", bg: "bg-gray-100" };

// ─── URLs cliquables dans le texte ────────────────────────────────────────────
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
function isUrl(s) { return s.startsWith("http://") || s.startsWith("https://"); }
function RichText({ text, isMe }) {
  if (!text) return null;
  const parts = text.split(URL_PATTERN);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        isUrl(part)
          ? <a key={i} href={part} target="_blank" rel="noreferrer"
               className={"underline underline-offset-2 break-all " + (isMe ? "text-blue-200 hover:text-white" : "text-blue-500 hover:text-blue-700")}>{part}</a>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

// ─── Emoji picker (sans dépendance) ──────────────────────────────────────────
const EMOJIS = [
  "😀","😂","😊","😍","🥰","😎","😭","😅","🤔","😬",
  "👍","👎","❤️","🔥","✅","🎉","🙏","💪","😴","🤣",
  "😮","😤","🥳","🤩","😇","🤗","😑","🙄","😏","🥲",
  "💯","⭐","✨","🚀","📚","📝","💡","🎯","⚡","🌟",
];
function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-16 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3 w-72">
      <div className="grid grid-cols-10 gap-0.5">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => { onPick(e); onClose(); }}
            className="text-lg hover:scale-125 transition-transform p-0.5 rounded">{e}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ prenom, nom, role, size = "md" }) {
  const s = { sm: "w-7 h-7 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-12 h-12 text-sm" }[size];
  return (
    <div className={`${s} ${ROLE_COLORS[role] ?? "bg-gray-400"} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {getInitials(prenom, nom)}
    </div>
  );
}

// ─── Bulle de message ─────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, onDelete, convMembers = [] }) {
  const [hover, setHover] = useState(false);

  // Coches : 1 coche grise = envoyé, 2 coches bleues = tous ont lu
  const othersCount = Math.max((convMembers.length || 0) - 1, 0);
  const readCount   = (msg.read_by || []).length;
  // allRead uniquement pertinent pour l'expéditeur (isMe)
  const allRead = isMe && othersCount > 0 && readCount >= othersCount;

  return (
    <div className={`flex gap-2 mb-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {!isMe && <Avatar prenom={msg.prenom} nom={msg.nom} role={msg.auteur_role} size="sm" />}

      <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <span className="text-[10px] text-gray-400 mb-1 px-1">{msg.prenom} {msg.nom}</span>}

        <div className={`rounded-2xl px-4 py-2.5 ${isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-sm shadow-sm"}`}>
          <RichText text={msg.contenu} isMe={isMe} />

          {/* Images */}
          {msg.images?.length > 0 && (
            <div className={`grid gap-1 mt-1 ${msg.images.length > 1 ? "grid-cols-2" : ""}`}>
              {msg.images.map((url, i) => (
                <img key={i} src={fullUrl(url)} alt="" onClick={() => window.open(fullUrl(url), "_blank")}
                  className="rounded-xl max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition" />
              ))}
            </div>
          )}

          {/* Fichiers */}
          {msg.fichiers?.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1.5">
              {msg.fichiers.map((f, i) => {
                const { Icon, color, bg } = fileMeta(f.nom_original);
                return (
                  <a key={i} href={fullUrl(f.url)} download={f.nom_original} target="_blank" rel="noreferrer"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition ${isMe ? "bg-white/15 hover:bg-white/25" : `${bg} hover:opacity-80`}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : bg}`}>
                      <Icon className={`h-4 w-4 ${isMe ? "text-white" : color}`} />
                    </div>
                    <span className={`truncate flex-1 font-medium ${isMe ? "text-white" : "text-gray-700 dark:text-gray-200"}`}>{f.nom_original}</span>
                    <Download className={`h-3.5 w-3.5 flex-shrink-0 ${isMe ? "text-white/70" : "text-gray-400"}`} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Heure + statut lu */}
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
          {/* ✅ Coches uniquement visibles par l'expéditeur */}
          {isMe === true && (
            allRead
              ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" title="Lu" />
              : <Check className="h-3.5 w-3.5 text-gray-400" title="Envoyé" />
          )}
          {isMe && hover && (
            <button onClick={() => onDelete(msg.id)} className="text-gray-300 hover:text-red-500 transition ml-1">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Zone de saisie ───────────────────────────────────────────────────────────
function MessageInput({ onSend }) {
  const [text, setText]           = useState("");
  const [files, setFiles]         = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef  = useRef(null);
  const textaRef = useRef(null);
  // ✅ Ref pour toujours avoir la valeur courante au moment de l'envoi
  const textRef  = useRef("");
  textRef.current = text;

  const addFiles = (e) => {
    Array.from(e.target.files || []).slice(0, 5 - files.length).forEach((f) => {
      const isImg = f.type.startsWith("image/");
      setFiles((p) => p.length >= 5 ? p : [...p, { preview: isImg ? URL.createObjectURL(f) : null, file: f, isImg, name: f.name }]);
    });
    e.target.value = "";
  };

  const insertEmoji = (emoji) => {
    const ta  = textaRef.current;
    const pos = ta?.selectionStart ?? textRef.current.length;
    const newText = textRef.current.slice(0, pos) + emoji + textRef.current.slice(pos);
    setText(newText);
    // ✅ Repositionner le curseur après l'emoji
    setTimeout(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(pos + emoji.length, pos + emoji.length);
      }
    }, 10);
  };

  const send = async () => {
    const currentText = textRef.current.trim();
    if (!currentText && files.length === 0) return;
    // ✅ Utiliser textRef.current pour avoir la valeur réelle
    await onSend(currentText, files.map((f) => f.file));
    setText(""); setFiles([]);
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 px-3 pt-2 pb-3 relative bg-white dark:bg-gray-900">
      {/* Aperçu fichiers */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800">
              {f.isImg
                ? <img src={f.preview} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex flex-col items-center justify-center p-1">
                    {(() => { const { Icon, color } = fileMeta(f.name); return <Icon className={`h-5 w-5 ${color}`} />; })()}
                    <span className="text-[7px] text-gray-500 truncate w-full text-center px-0.5">{f.name}</span>
                  </div>
              }
              <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />}

      <div className="flex items-end gap-1.5">
        <button onClick={() => setShowEmoji((v) => !v)}
          className={`flex-shrink-0 p-2 rounded-xl transition ${showEmoji ? "bg-yellow-100 text-yellow-500" : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"}`}>
          <Smile className="h-5 w-5" />
        </button>

        <button onClick={() => fileRef.current?.click()} disabled={files.length >= 5}
          className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 disabled:opacity-30 transition">
          <Paperclip className="h-5 w-5" />
        </button>

        <input ref={fileRef} type="file" multiple className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={addFiles} />

        <textarea ref={textaRef} value={text} rows={1} placeholder="Écrire un message..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 max-h-32 overflow-y-auto"
          style={{ lineHeight: "1.5" }} />

        <button onClick={send} disabled={!text.trim() && files.length === 0}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white transition">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Modal groupe ─────────────────────────────────────────────────────────────
function GroupModal({ users, onClose, onCreate }) {
  const [nom, setNom]         = useState("");
  const [sel, setSel]         = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const toggle = (id) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const filtered = users.filter((u) => `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nouveau groupe</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <input type="text" placeholder="Nom du groupe..." value={nom} onChange={(e) => setNom(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Ajouter des membres..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {sel.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {sel.map((id) => { const u = users.find((x) => x.id === id); return u ? (
                <span key={id} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full">
                  {u.prenom} {u.nom} <button onClick={() => toggle(id)}><X className="h-3 w-3" /></button>
                </span>) : null; })}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((u) => (
              <div key={u.id} onClick={() => toggle(u.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition ${sel.includes(u.id) ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                <Avatar prenom={u.prenom} nom={u.nom} role={u.role} size="sm" />
                <span className="text-sm text-gray-800 dark:text-white flex-1">{u.prenom} {u.nom}</span>
                {sel.includes(u.id) && <CheckCheck className="h-4 w-4 text-blue-500" />}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
          <button disabled={!nom.trim() || loading}
            onClick={async () => { setLoading(true); try { await onCreate(nom, sel); onClose(); } finally { setLoading(false); } }}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium">
            {loading ? <Loader className="h-4 w-4 animate-spin mx-auto" /> : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal conv privée ────────────────────────────────────────────────────────
function PrivateModal({ users, onClose, onStart }) {
  const [search, setSearch] = useState("");
  const filtered = users.filter((u) => `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nouvelle conversation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={search} autoFocus onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.map((u) => (
              <div key={u.id} onClick={() => { onStart(u.id); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <Avatar prenom={u.prenom} nom={u.nom} role={u.role} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{u.prenom} {u.nom}</p>
                  <p className="text-xs text-gray-400">{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Messaging({ onUnreadChange }) {
  const socket = useSocket();
  const user   = JSON.parse(localStorage.getItem("user") || "{}");

  const [conversations, setConvs]    = useState([]);
  const [activeConv, setActiveConv]  = useState(null);
  const [messages, setMessages]      = useState([]);
  const [allUsers, setAllUsers]      = useState([]);
  const [loadingC, setLoadingC]      = useState(true);
  const [loadingM, setLoadingM]      = useState(false);
  const [search, setSearch]          = useState("");
  const [showPrivate, setShowPrivate] = useState(false);
  const [showGroup, setShowGroup]    = useState(false);
  const [mobileView, setMobileView]  = useState("list");

  const bottomRef     = useRef(null);
  const activeConvRef = useRef(null);
  activeConvRef.current = activeConv;

  // Notifier la navbar du total non lus
  useEffect(() => {
    const total = conversations.reduce((a, c) => a + (c.non_lus || 0), 0);
    onUnreadChange?.(total);
  }, [conversations, onUnreadChange]);

  // Chargement initial
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("Messaging: pas de token, redirection login");
      setLoadingC(false);
      return;
    }
    (async () => {
      setLoadingC(true);
      try {
        const [cr, ur] = await Promise.all([
          apiClient.get("/messaging/conversations"),
          apiClient.get("/messaging/utilisateurs"),
        ]);
        setConvs(cr.data || []);
        setAllUsers(ur.data || []);
      } catch (e) {
        console.error("Messaging load error:", e.response?.status, e.response?.data);
      }
      finally { setLoadingC(false); }
    })();
  }, []);

  // Socket.IO
  useEffect(() => {
    if (!socket) return;
    conversations.forEach((c) => socket.emit("join_conv", { convId: c.id }));

    const onMsg = ({ convId, message }) => {
      const active = activeConvRef.current;
      const here   = active?.id === convId;
      if (here) {
        setMessages((p) => p.some((m) => m.id === message.id) ? p : [...p, message]);
        apiClient.post(`/messaging/conversations/${convId}/lu`).catch(() => {});
      }
      setConvs((p) => p.map((c) => c.id !== convId ? c : {
        ...c, dernier_message: message,
        non_lus: here ? 0 : (c.non_lus || 0) + 1,
      }));
    };

    const onDel    = ({ convId, msgId }) => {
      if (activeConvRef.current?.id === convId) setMessages((p) => p.filter((m) => m.id !== msgId));
    };
    const onConv   = (conv) => {
      setConvs((p) => p.some((c) => c.id === conv.id) ? p : [conv, ...p]);
      socket.emit("join_conv", { convId: conv.id });
    };
    // ✅ Mise à jour statut lu en temps réel
    const onRead = ({ convId, userId, lastReadId }) => {
      if (activeConvRef.current?.id === convId)
        setMessages((p) => p.map((m) => m.id <= lastReadId
          ? { ...m, read_by: [...new Set([...(m.read_by || []), userId])] } : m));
    };

    socket.on("new_message",      onMsg);
    socket.on("delete_message",   onDel);
    socket.on("new_conversation", onConv);
    socket.on("msg_read",         onRead);
    return () => {
      socket.off("new_message",      onMsg);
      socket.off("delete_message",   onDel);
      socket.off("new_conversation", onConv);
      socket.off("msg_read",         onRead);
    };
  }, [socket, conversations]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const openConv = async (conv) => {
    setActiveConv(conv); setMobileView("chat"); setLoadingM(true);
    try {
      const res = await apiClient.get(`/messaging/conversations/${conv.id}/messages`);
      // ✅ S'assurer que read_by est initialisé pour chaque message
      const msgs = (res.data || []).map((m) => ({ ...m, read_by: m.read_by || [] }));
      setMessages(msgs);
      setConvs((p) => p.map((c) => c.id === conv.id ? { ...c, non_lus: 0 } : c));
      socket?.emit("join_conv", { convId: conv.id });
      apiClient.post(`/messaging/conversations/${conv.id}/lu`).catch(() => {});
    } catch (e) { console.error(e); }
    finally { setLoadingM(false); }
  };

  const handleSend = async (contenu, fileList) => {
    if (!activeConv) return;
    const fd = new FormData();
    if (contenu) fd.append("contenu", contenu);
    fileList.forEach((f) => fd.append("images", f));
    try {
      await apiClient.post(`/messaging/conversations/${activeConv.id}/messages`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (msgId) => {
    if (!activeConv) return;
    try { await apiClient.delete(`/messaging/conversations/${activeConv.id}/messages/${msgId}`); } catch (e) { console.error(e); }
  };

  const handlePrivate = async (userId) => {
    try {
      const res = await apiClient.post("/messaging/conversations/privee", { userId });
      setConvs((p) => p.some((c) => c.id === res.data.id) ? p : [res.data, ...p]);
      openConv(res.data);
    } catch (e) { console.error(e); }
  };

  const handleGroup = async (nom, membres) => {
    try {
      const res = await apiClient.post("/messaging/conversations/groupe", { nom, membres });
      setConvs((p) => [res.data, ...p]);
      openConv(res.data);
    } catch (e) { console.error(e); }
  };

  const convName   = (c) => c.type === "groupe" ? c.nom : (c.membres?.find((m) => m.id !== user.id) ? `${c.membres.find((m) => m.id !== user.id).prenom} ${c.membres.find((m) => m.id !== user.id).nom}` : "Conversation");
  const convAvatar = (c) => c.type === "groupe" ? null : c.membres?.find((m) => m.id !== user.id);

  const filtered    = conversations.filter((c) => convName(c).toLowerCase().includes(search.toLowerCase()));
  const totalUnread = conversations.reduce((a, c) => a + (c.non_lus || 0), 0);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Messages</h2>
              {totalUnread > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowPrivate(true)} title="Nouveau message"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 transition">
                <UserPlus className="h-4 w-4" />
              </button>
              <button onClick={() => setShowGroup(true)} title="Nouveau groupe"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 transition">
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingC ? <div className="flex justify-center py-10"><Loader className="h-5 w-5 animate-spin text-blue-500" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Send className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Aucune conversation</p>
            </div>
          ) : filtered.map((c) => {
            const name    = convName(c);
            const av      = convAvatar(c);
            const active  = activeConv?.id === c.id;
            const unread  = (c.non_lus || 0) > 0;
            return (
              <div key={c.id} onClick={() => openConv(c)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition border-l-2 ${active ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500" : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent"}`}>
                {c.type === "groupe"
                  ? <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0"><Users className="h-5 w-5" /></div>
                  : av ? <Avatar prenom={av.prenom} nom={av.nom} role={av.role} />
                  : <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-sm truncate ${unread ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>{name}</span>
                      {c.type === "groupe" && <Lock className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                    </div>
                    <span className={`text-[10px] flex-shrink-0 ml-2 ${unread ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                      {c.dernier_message ? formatTime(c.dernier_message.created_at) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${unread ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400"}`}>
                      {c.dernier_message ? (c.dernier_message.contenu || "📎 Pièce jointe") : "Aucun message"}
                    </p>
                    {unread && (
                      <span className="ml-2 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {c.non_lus > 9 ? "9+" : c.non_lus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Zone chat ───────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Sélectionnez une conversation</p>
            <p className="text-gray-400 text-sm mt-1">ou démarrez-en une nouvelle</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <button onClick={() => setMobileView("list")} className="md:hidden text-gray-500">
                <ChevronLeft className="h-5 w-5" />
              </button>
              {activeConv.type === "groupe"
                ? <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0"><Users className="h-4 w-4" /></div>
                : (() => { const o = convAvatar(activeConv); return o ? <Avatar prenom={o.prenom} nom={o.nom} role={o.role} size="sm" /> : null; })()
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{convName(activeConv)}</p>
                {activeConv.type === "groupe" && <p className="text-xs text-gray-400">{activeConv.membres?.length ?? 0} membres</p>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
              {loadingM
                ? <div className="flex justify-center py-10"><Loader className="h-5 w-5 animate-spin text-blue-500" /></div>
                : messages.length === 0
                ? <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-gray-400 text-sm">Aucun message pour le moment.</p>
                    <p className="text-gray-300 text-xs mt-1">Envoyez le premier message !</p>
                  </div>
                : <>
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} isMe={Number(msg.auteur_id) === Number(user.id)}
                        onDelete={handleDelete} convMembers={activeConv.membres} />
                    ))}
                    <div ref={bottomRef} />
                  </>
              }
            </div>

            <MessageInput onSend={handleSend} />
          </>
        )}
      </div>

      {showPrivate && <PrivateModal users={allUsers} onClose={() => setShowPrivate(false)} onStart={handlePrivate} />}
      {showGroup   && <GroupModal   users={allUsers} onClose={() => setShowGroup(false)}   onCreate={handleGroup} />}
    </div>
  );
}