import { Show, createSignal, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import LoaderCircle from "~/components/icons/loader-circle";
import { Button } from "~/components/ui/input/button";

import styles from "./confirm-dialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "outline" | "ghost";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  children?: JSX.Element;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const [running, setRunning] = createSignal(false);

  const handleConfirm = async () => {
    const result = props.onConfirm();
    if (result instanceof Promise) {
      setRunning(true);
      try {
        await result;
      } finally {
        setRunning(false);
      }
    }
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class={styles.overlay}>
          <div class={styles.dialog} role="dialog" aria-modal="true">
            <div class={styles.header}>
              <h3 class={styles.title}>{props.title}</h3>
              <p class={styles.description}>{props.description}</p>
            </div>
            {props.children}
            <div class={styles.actions}>
              <Button
                type="button"
                variant="outline"
                disabled={running()}
                onClick={props.onClose}
              >
                {props.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                type="button"
                variant={props.variant ?? "primary"}
                disabled={running()}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                <Show when={running()} fallback={props.confirmLabel}>
                  <LoaderCircle size={16} class="animate-spin" />
                </Show>
              </Button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
