// src/components/ui/PublicRoute.jsx
// Bloque l'accès aux pages publiques (login, forgot-password...)
// si l'utilisateur est déjà connecté → redirige vers /dashboard
import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  const user  = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  })();

  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}