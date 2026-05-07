import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { Button } from "~/components/ui/input/button";
import { cn } from "~/lib/utils";

import type { SnackBarInternalItem } from "../states/snackBarInternalComponentState";

import styles from "./SnackBar.module.css";

interface SnackBarProps {
  snackBar: SnackBarInternalItem;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

export function SnackBar(props: SnackBarProps) {
  const progressWidth =
    props.snackBar.duration <= 0
      ? "100%"
      : `${(props.snackBar.remaining / props.snackBar.duration) * 100}%`;

  return (
    <div
      class={cn(
        styles.snackBar,
        props.snackBar.variant === "success"
          ? styles.success
          : props.snackBar.variant === "error"
            ? styles.error
            : props.snackBar.variant === "info"
              ? styles.info
              : props.snackBar.variant === "warning"
                ? styles.warning
                : styles.default,
      )}
      onMouseEnter={() => props.onPause(props.snackBar.id)}
      onMouseLeave={() => props.onResume(props.snackBar.id)}
      role="status"
      aria-live="polite"
    >
      <div class={styles.progressBar} style={{ width: progressWidth }} />
      <div class={styles.icon}>
        {props.snackBar.variant === "success" && <CircleCheckBig size={16} />}
        {props.snackBar.variant === "error" && <CircleAlert size={16} />}
        {props.snackBar.variant === "info" && <Info size={16} />}
        {props.snackBar.variant === "warning" && <CircleAlert size={16} />}
        {props.snackBar.variant === "default" && <Info size={16} />}
      </div>

      <div class={styles.content}>
        <p class={styles.message}>{props.snackBar.message}</p>
        {props.snackBar.details && (
          <p class={styles.details}>{props.snackBar.details}</p>
        )}
        {props.snackBar.action && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class={styles.action}
            onClick={() => props.snackBar.action?.onClick?.()}
          >
            {props.snackBar.action.label}
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => props.onDismiss(props.snackBar.id)}
        class={styles.dismiss}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
