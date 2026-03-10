import React from "react";
import { useAuth } from "../../lib/auth-context";
import { Bell, Menu, Search } from "lucide-react";
import NotificationBell from "./NotificationBell";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function DashboardHeader({ title, onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 leading-tight">{title}</h2>
          {user && (
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              {greeting()}, <span className="text-blue-600">{user.prenom}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Barre de recherche responsive */}
        <div className="hidden sm:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="pl-9 pr-4 py-2 w-40 md:w-64 rounded-full bg-gray-100 border-transparent text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Notifications */}
          <NotificationBell/>
      
      </div>
    </header>
  );
}