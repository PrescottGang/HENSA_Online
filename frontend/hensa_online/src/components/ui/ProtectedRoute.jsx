// src/components/ui/ProtectedRoute.jsx
// Garde les routes protégées — redirige vers / si non connecté
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user  = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  })();

  // Pas connecté → login
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  // Rôle non autorisé → dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}