import { useEffect } from "react";
import { X } from "lucide-react";

export default function ConfirmModal({
  open,
  title = "Confirmation",
  message = "Êtes-vous sûr ?",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
  variant = "danger", // "danger" | "primary"
}) {
  // Fermer avec ESC
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };

    if (open) {
      window.addEventListener("keydown", handleKey);
    }

    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmStyle =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      
      {/* Overlay click */}
      <div
        className="absolute inset-0"
        onClick={onCancel}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-md p-6 z-10 animate-scaleIn">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {title}
          </h2>

          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white transition ${confirmStyle}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
