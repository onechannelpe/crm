import { For } from "solid-js";
import { Portal } from "solid-js/web";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { Button } from "~/components/ui/button";
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
                  ? "bg-[color-mix(in_oklab,#effaf4_84%,var(--overlay))] text-[color-mix(in_oklab,#1d6a43_90%,black)]"
                  : toast.type === "error"
                    ? "bg-[color-mix(in_oklab,#fef0f0_82%,var(--overlay))] text-[color-mix(in_oklab,#7b1f1f_90%,black)]"
                    : "bg-[color-mix(in_oklab,#edf5ff_84%,var(--overlay))] text-[color-mix(in_oklab,#1c4f7c_90%,black)]"
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
