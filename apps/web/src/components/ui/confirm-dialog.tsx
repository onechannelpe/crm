import { Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/input/button";

import styles from "./confirm-dialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "outline" | "ghost";
  onConfirm: () => void;
  onClose: () => void;
  children?: JSX.Element;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
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
              <Button type="button" variant="outline" onClick={props.onClose}>
                {props.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                type="button"
                variant={props.variant ?? "primary"}
                onClick={props.onConfirm}
              >
                {props.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
