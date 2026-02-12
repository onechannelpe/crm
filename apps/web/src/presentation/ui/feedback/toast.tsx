import { For } from "solid-js";
import { Portal } from "solid-js/web";
import { useToast } from "./toast-provider";
import { X, CheckCircle, AlertCircle, Info } from "lucide-solid";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <Portal>
      <div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        <For each={toasts}>
          {(toast) => (
            <div
              class={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${toast.type === "success"
                  ? "bg-green-50 text-green-900"
                  : toast.type === "error"
                    ? "bg-red-50 text-red-900"
                    : "bg-blue-50 text-blue-900"
                }`}
            >
              {toast.type === "success" && <CheckCircle class="w-5 h-5 text-green-600" />}
              {toast.type === "error" && <AlertCircle class="w-5 h-5 text-red-600" />}
              {toast.type === "info" && <Info class="w-5 h-5 text-blue-600" />}

              <p class="flex-1 text-sm font-medium">{toast.message}</p>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                class="text-gray-400 hover:text-gray-600"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
