import { For } from "solid-js";
import { Portal } from "solid-js/web";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { Button } from "~/components/ui/input/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { cn } from "~/lib/utils";

import { useToast } from "./toast-provider";
import styles from "./toast.module.css";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <Portal>
      <div
        class={styles.container}
        style={{ "z-index": DS_Z_INDEX.toast }}
      >
        <For each={toasts}>
          {(toast) => (
            <div
              class={cn(
                styles.toast,
                toast.type === "success"
                  ? styles.success
                  : toast.type === "error"
                    ? styles.error
                    : styles.info,
              )}
            >
              {toast.type === "success" && <CircleCheckBig size={20} />}
              {toast.type === "error" && <CircleAlert size={20} />}
              {toast.type === "info" && <Info size={20} />}

              <p class={styles.message}>{toast.message}</p>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeToast(toast.id)}
                class={styles.dismiss}
              >
                <X size={16} />
              </Button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
