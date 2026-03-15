import { createContext, useContext, onCleanup, type JSX } from "solid-js";
import { createStore } from "solid-js/store";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration: number;
  remaining: number;
  paused: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: Toast["type"], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>();

export function ToastProvider(props: { children: JSX.Element }) {
  const [toasts, setToasts] = createStore<Toast[]>([]);
  let toastCounter = 0;

  // Global tick for all toasts
  const tickInterval = setInterval(() => {
    setToasts(
      (t) => !t.paused,
      "remaining",
      (r) => Math.max(0, r - 100),
    );

    // Auto-remove expired toasts
    toasts.forEach((toast) => {
      if (toast.remaining <= 0) {
        removeToast(toast.id);
      }
    });
  }, 100);

  onCleanup(() => clearInterval(tickInterval));

  const showToast = (type: Toast["type"], message: string, duration = 5000) => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    setToasts((prev) => [
      ...prev,
      { id, type, message, duration, remaining: duration, paused: false },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const pauseToast = (id: string) => {
    setToasts((t) => t.id === id, "paused", true);
  };

  const resumeToast = (id: string) => {
    setToasts((t) => t.id === id, "paused", false);
  };

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, pauseToast, resumeToast }}
    >
      {props.children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
