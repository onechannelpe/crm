import { createContext, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";

interface Toast {
    id: string;
    type: "success" | "error" | "info";
    message: string;
}

interface ToastContextValue {
    toasts: Toast[];
    showToast: (type: Toast["type"], message: string) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>();

export function ToastProvider(props: { children: JSX.Element }) {
    const [toasts, setToasts] = createStore<Toast[]>([]);

    const showToast = (type: Toast["type"], message: string) => {
        const id = Math.random().toString(36);
        setToasts([...toasts, { id, type, message }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts(toasts.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
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
