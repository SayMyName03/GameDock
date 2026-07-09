import { useAppStore } from "../store/useAppStore";

export function Toast() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`
            px-4 py-3 rounded-lg text-sm cursor-pointer animate-fade-in
            backdrop-blur-sm border
            ${toast.type === "error"
              ? "bg-red-500/15 border-red-500/30 text-red-300"
              : "bg-green-500/15 border-green-500/30 text-green-300"
            }
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
