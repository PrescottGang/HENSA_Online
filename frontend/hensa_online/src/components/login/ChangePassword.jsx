import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function ChangePassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/change-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            nouveauMotDePasse: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Une erreur est survenue.");
        return;
      }

      setSuccess("Mot de passe modifié avec succès.");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">

      {/* Card centrale */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">

        {/* En-tête */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
            Modifier votre mot de passe
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de
            passe lors de votre première connexion.
          </p>
        </div>

        {/* Message erreur */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            {error}
          </div>
        )}

        {/* Message succès */}
        {success && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nouveau mot de passe
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition dark:bg-gray-700 dark:text-white"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Confirmer le mot de passe
            </label>

            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition dark:bg-gray-700 dark:text-white"
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              >
                {showConfirm ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold transition hover:scale-[1.01] active:scale-[0.98] shadow-lg disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #1a3faa, #2255d4)" }}
          >
            {loading ? "Modification en cours..." : "Modifier le mot de passe"}
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">
            Après modification, vous serez automatiquement redirigé vers votre tableau de bord.
          </p>

        </form>
      </div>
    </div>
  );
}