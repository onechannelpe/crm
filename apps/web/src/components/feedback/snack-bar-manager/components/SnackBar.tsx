import { A } from "@solidjs/router";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { ProgressBar } from "~/components/ui/feedback/progress-bar";
import { useProgressAnimation } from "~/components/ui/feedback/use-progress-animation";
import { Button } from "~/components/ui/input/button";
import { cn } from "~/lib/utils";

import type { SnackBarInternalItem } from "../states/snackBarInternalComponentState";
import { sanitizeMessageToRenderInSnackbar } from "../utils/sanitizeMessageToRenderInSnackbar";

import styles from "./SnackBar.module.css";

interface SnackBarProps {
  snackBar: SnackBarInternalItem;
  onClose?: (id: string) => void;
}

export function SnackBar(props: SnackBarProps) {
  const progress = useProgressAnimation({
    durationMs: props.snackBar.duration,
    autoPlay:
      props.snackBar.duration > 0 && props.snackBar.progress === undefined,
    initialValue: props.snackBar.progress ?? 100,
    finalValue: 0,
    onComplete: () => props.onClose?.(props.snackBar.id),
  });
  const progressValue = () =>
    props.snackBar.duration <= 0 ? 100 : progress.value();
  const sanitizedMessage =
    sanitizeMessageToRenderInSnackbar(props.snackBar.message) ?? "";
  const sanitizedDetailedMessage = sanitizeMessageToRenderInSnackbar(
    props.snackBar.detailedMessage,
  );
  const role = props.snackBar.role ?? "status";
  const ariaLive = role === "alert" ? "assertive" : "polite";
  const titleByVariant = {
    default: "Alert",
    error: "Error",
    info: "Info",
    success: "Success",
    warning: "Warning",
  } as const;
  const title = sanitizedMessage || titleByVariant[props.snackBar.variant];

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
      onMouseEnter={() => progress.pause()}
      onMouseLeave={() => progress.play()}
      role={role}
      aria-live={ariaLive}
      title={title}
      data-globally-prevent-click-outside
    >
      <ProgressBar value={progressValue()} />
      <div class={styles.header}>
        <div class={styles.icon}>
          {props.snackBar.icon}
          {!props.snackBar.icon && props.snackBar.variant === "success" && (
            <CircleCheckBig size={16} />
          )}
          {!props.snackBar.icon && props.snackBar.variant === "error" && (
            <CircleAlert size={16} />
          )}
          {!props.snackBar.icon && props.snackBar.variant === "info" && (
            <Info size={16} />
          )}
          {!props.snackBar.icon && props.snackBar.variant === "warning" && (
            <CircleAlert size={16} />
          )}
          {!props.snackBar.icon && props.snackBar.variant === "default" && (
            <CircleAlert size={16} />
          )}
        </div>
        <p class={styles.message}>{sanitizedMessage}</p>
        <div class={styles.actions}>
          {props.snackBar.onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class={styles.cancel}
              onClick={props.snackBar.onCancel}
            >
              Cancelar
            </Button>
          )}
          {props.onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => props.onClose?.(props.snackBar.id)}
              class={styles.dismiss}
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {sanitizedDetailedMessage && (
        <p class={styles.details}>{sanitizedDetailedMessage}</p>
      )}
      {props.snackBar.buttonLabel &&
        (props.snackBar.buttonOnClick || props.snackBar.buttonTo) && (
          <div class={styles.bottomActionContainer}>
            <hr class={styles.separator} />
            <div class={styles.bottomAction}>
              {props.snackBar.buttonTo ? (
                <A href={props.snackBar.buttonTo} class={styles.actionLink}>
                  {props.snackBar.buttonLabel}
                </A>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class={styles.action}
                  onClick={props.snackBar.buttonOnClick}
                >
                  {props.snackBar.buttonLabel}
                </Button>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
