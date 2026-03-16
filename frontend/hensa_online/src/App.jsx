import { motion } from "framer-motion";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./components/ui/Dashboard";
import Layout from "./Layout";
import Announcement from "./components/dashbord/Announcement";
import UsersManagement from "./components/dashbord/Users";
import ChangePassword from "./components/login/ChangePassword";
import ForgotPassword from "./components/login/ForgotPassword";
import ResetPassword from "./components/login/ResetPassword";
import PublicationsFeed from "./components/dashbord/PublicationsFeed";
import Notification from "./components/dashbord/Notification";
import Matiere from "./components/dashbord/Matieres";
import Profil from "./components/dashbord/Profil";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />} />
        <Route path="/changer-password" element={<ChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profil" element={<Profil />} />
        
        <Route path="/publications" element={<PublicationsFeed />} />
        <Route path="/annonces" element={<Announcement />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/notifications" element={<Notification />} />
        <Route path="/matieres" element={<Matiere />} />
      </Routes>
    </>
  );
}
