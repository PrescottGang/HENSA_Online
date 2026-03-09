import { useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Une erreur est survenue.");
        return;
      }

      // Stocker le token et les infos utilisateur
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Rediriger selon le rôle
      const role = data.user.role;
      if (data.user.premiereConnexion) {
        window.location.href = "/changer-password";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("Impossible de contacter le serveur. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-12">
          Connectez-vous à votre espace
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base">
          Cette plateforme est réservée aux étudiants, enseignants et membres de
          l'administration.
        </p>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Adresse e-mail institutionnelle
          </label>
          <input
            disabled={loading}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@hensa.univ"
            className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200 dark:bg-gray-800 dark:text-white"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Mot de passe
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <div className="relative">
            <input
              disabled={loading}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 text-base rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200 dark:bg-gray-800 dark:text-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200"
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 text-base rounded-lg text-white font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: "linear-gradient(135deg, #1a3faa, #2255d4)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Connexion en cours...
            </span>
          ) : (
            "Accéder à mon espace"
          )}
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">
          En vous connectant, vous acceptez les conditions d'utilisation et la
          politique de confidentialité de la plateforme.
        </p>
      </form>
    </div>
  );
}
