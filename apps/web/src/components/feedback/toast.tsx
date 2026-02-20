import { For } from "solid-js";
import { Portal } from "solid-js/web";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { Button } from "~/components/ui/input/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";

import { useToast } from "./toast-provider";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <Portal>
      <div
        class="fixed right-4 top-4 max-w-md space-y-2"
        style={{ "z-index": DS_Z_INDEX.toast }}
      >
        <For each={toasts}>
          {(toast) => (
            <div
              class={`crm-overlay-panel flex items-start gap-3 rounded-2xl p-4 ${
                toast.type === "success"
                  ? "border-success/35 bg-success/14 text-success"
                  : toast.type === "error"
                    ? "border-destructive/35 bg-destructive/14 text-destructive"
                    : "border-info/35 bg-info/14 text-info"
              }`}
            >
              {toast.type === "success" && <CircleCheckBig class="h-5 w-5" />}
              {toast.type === "error" && <CircleAlert class="h-5 w-5" />}
              {toast.type === "info" && <Info class="h-5 w-5" />}

              <p class="flex-1 text-sm font-medium">{toast.message}</p>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeToast(toast.id)}
                class="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
