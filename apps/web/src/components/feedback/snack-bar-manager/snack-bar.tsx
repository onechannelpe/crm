import { A } from "@solidjs/router";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { ProgressBar } from "~/components/ui/feedback/progress-bar";
import { Button } from "~/components/ui/input/button";
import { cn } from "~/lib/utils";

import type { SnackBarItem, SnackBarVariant } from "./types";

import styles from "./snack-bar.module.css";

const variantStyles = {
  success: styles.success,
  error: styles.error,
  info: styles.info,
  warning: styles.warning,
  default: styles.default,
} satisfies Record<SnackBarVariant, string>;

const titleByVariant = {
  default: "Alert",
  error: "Error",
  info: "Info",
  success: "Success",
  warning: "Warning",
} satisfies Record<SnackBarVariant, string>;

interface SnackBarProps {
  item: SnackBarItem;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function SnackBar(props: SnackBarProps) {
  const progressValue = () =>
    props.item.duration <= 0
      ? 100
      : Math.max(0, (1 - props.item.elapsed / props.item.duration) * 100);

  const resolvedIcon = () => {
    if (props.item.icon) return props.item.icon;
    switch (props.item.variant) {
      case "success":
        return <CircleCheckBig size={16} />;
      case "info":
        return <Info size={16} />;
      case "error":
      case "warning":
      case "default":
        return <CircleAlert size={16} />;
    }
  };

  return (
    <div
      class={cn(styles.snackBar, variantStyles[props.item.variant])}
      onMouseEnter={props.onPause}
      onMouseLeave={props.onResume}
      role={props.item.role}
      aria-live={props.item.role === "alert" ? "assertive" : "polite"}
      title={props.item.message || titleByVariant[props.item.variant]}
      data-globally-prevent-click-outside
    >
      <ProgressBar value={progressValue()} />
      <div class={styles.header}>
        <div class={styles.icon}>{resolvedIcon()}</div>
        <p class={styles.message}>{props.item.message}</p>
        <div class={styles.actions}>
          {props.item.onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class={styles.cancel}
              onClick={props.item.onCancel}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={props.onDismiss}
            class={styles.dismiss}
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {props.item.detailedMessage && (
        <p class={styles.details}>{props.item.detailedMessage}</p>
      )}

      {props.item.buttonLabel &&
        (props.item.buttonOnClick || props.item.buttonTo) && (
          <div class={styles.bottomActionContainer}>
            <hr class={styles.separator} />
            <div class={styles.bottomAction}>
              {props.item.buttonTo ? (
                <A href={props.item.buttonTo} class={styles.actionLink}>
                  {props.item.buttonLabel}
                </A>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class={styles.action}
                  onClick={props.item.buttonOnClick ?? undefined}
                >
                  {props.item.buttonLabel}
                </Button>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
