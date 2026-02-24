import { motion } from "framer-motion";
import Login from "./components/login/login";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./components/ui/Dashboard";
import Layout from "./Layout";
import Announcement from "./components/dashbord/Announcement";
import Users from "./components/dashbord/Users";
import UsersManagement from "./components/dashbord/Users";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/annonces" element={<Announcement />} />
        <Route path="/users" element={<UsersManagement />} />
      </Routes>
    </>
  );
}
