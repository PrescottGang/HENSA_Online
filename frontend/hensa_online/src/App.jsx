// src/App.jsx
import { Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import PublicRoute    from "./components/ui/PublicRoute";

// Pages publiques (auth)
import Layout          from "./Layout";               // page login
import ChangePassword  from "./components/login/ChangePassword";
import ForgotPassword  from "./components/login/ForgotPassword";
import ResetPassword   from "./components/login/ResetPassword";

// Dashboard protégé
import Dashboard       from "./components/ui/Dashboard";

export default function App() {
  return (
    <Routes>
      {/* ── Pages publiques : accessibles uniquement si NON connecté ─────── */}
      <Route path="/" element={
        <PublicRoute>
          <Layout />
        </PublicRoute>
      }/>

      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      }/>

      <Route path="/reset-password" element={
        <PublicRoute>
          <ResetPassword />
        </PublicRoute>
      }/>

      {/* ── Changement de mot de passe : accessible connecté ou non ─────── */}
      {/* (première connexion, l'utilisateur doit pouvoir y accéder)         */}
      <Route path="/changer-password" element={<ChangePassword />}/>

      {/* ── Dashboard : protégé, tous rôles ──────────────────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }/>

      {/* ── Redirection par défaut ────────────────────────────────────────── */}
      {/* Toute URL inconnue → login (ou dashboard si connecté via PublicRoute) */}
      <Route path="*" element={<Navigate to="/" replace />}/>
    </Routes>
  );
}