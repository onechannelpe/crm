import {
  createContext,
  useContext,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
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
  showToast: (
    type: Toast["type"],
    message: string,
    duration?: number,
  ) => string;
  updateToast: (
    id: string,
    patch: Partial<Pick<Toast, "type" | "message" | "duration" | "remaining">>,
  ) => void;
  removeToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>();

export function ToastProvider(props: { children: JSX.Element }) {
  const [toasts, setToasts] = createStore<Toast[]>([]);
  let toastCounter = 0;

  const showToast = (type: Toast["type"], message: string, duration = 5000) => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    setToasts((prev) => [
      ...prev,
      { id, type, message, duration, remaining: duration, paused: false },
    ]);
    return id;
  };

  const updateToast = (
    id: string,
    patch: Partial<Pick<Toast, "type" | "message" | "duration" | "remaining">>,
  ) => {
    setToasts(
      (toast) => toast.id === id,
      (toast) => {
        const duration = patch.duration ?? toast.duration;
        const remaining =
          patch.remaining ??
          (patch.duration !== undefined ? duration : toast.remaining);
        return {
          ...toast,
          ...patch,
          duration,
          remaining,
        };
      },
    );
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

  onMount(() => {
    const tickInterval = setInterval(() => {
      setToasts(
        (t) => !t.paused && t.duration > 0,
        "remaining",
        (r) => Math.max(0, r - 100),
      );

      toasts.forEach((toast) => {
        if (toast.duration > 0 && toast.remaining <= 0) {
          removeToast(toast.id);
        }
      });
    }, 100);

    onCleanup(() => clearInterval(tickInterval));
  });

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        updateToast,
        removeToast,
        pauseToast,
        resumeToast,
      }}
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
