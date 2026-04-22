import { For } from "solid-js";
import { Portal } from "solid-js/web";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { Button } from "~/components/ui/input/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { cn } from "~/lib/utils";

import { useToast } from "./provider";

import styles from "./container.module.css";

export function ToastContainer() {
  const { toasts, removeToast, pauseToast, resumeToast } = useToast();

  return (
    <Portal>
      <div class={styles.container} style={{ "z-index": DS_Z_INDEX.toast }}>
        <For each={toasts}>
          {(toast) => (
            <div
              class={cn(
                styles.toast,
                toast.type === "success"
                  ? styles.success
                  : toast.type === "error"
                    ? styles.error
                    : toast.type === "info"
                      ? styles.info
                      : styles.warning,
              )}
              onMouseEnter={() => pauseToast(toast.id)}
              onMouseLeave={() => resumeToast(toast.id)}
            >
              <div
                class={styles.progressBar}
                style={{
                  width:
                    toast.duration <= 0
                      ? "100%"
                      : `${(toast.remaining / toast.duration) * 100}%`,
                }}
              />
              <div class={styles.icon}>
                {toast.type === "success" && <CircleCheckBig size={16} />}
                {toast.type === "error" && <CircleAlert size={16} />}
                {toast.type === "info" && <Info size={16} />}
                {toast.type === "warning" && <CircleAlert size={16} />}
              </div>

              <p class={styles.message}>{toast.message}</p>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeToast(toast.id)}
                class={styles.dismiss}
              >
                <X size={14} />
              </Button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
