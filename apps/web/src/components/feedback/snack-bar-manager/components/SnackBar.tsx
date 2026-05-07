import { createEffect, onCleanup } from "solid-js";

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
  isPresent: boolean;
  onSafeToRemove: () => void;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

export function SnackBar(props: SnackBarProps) {
  let el: HTMLDivElement | undefined;
  let currentAnimation: Animation | undefined;

  const cancelCurrentAnimation = () => {
    currentAnimation?.cancel();
    currentAnimation = undefined;
  };

  createEffect(() => {
    if (!el || typeof window === "undefined") return;

    cancelCurrentAnimation();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (!props.isPresent) props.onSafeToRemove();
      return;
    }

    if (props.isPresent) {
      currentAnimation = el.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(0.98)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: 220,
          easing: "ease-out",
          fill: "both",
        },
      );
      currentAnimation.onfinish = () => {
        if (!el) return;
        el.style.opacity = "";
        el.style.transform = "";
      };
      return;
    }

    currentAnimation = el.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-6px) scale(0.98)" },
      ],
      {
        duration: 180,
        easing: "ease-out",
        fill: "both",
      },
    );
    currentAnimation.onfinish = () => props.onSafeToRemove();
  });

  onCleanup(cancelCurrentAnimation);

  const progressWidth =
    props.snackBar.duration <= 0
      ? "100%"
      : `${(props.snackBar.remaining / props.snackBar.duration) * 100}%`;

  return (
    <div
      ref={(node) => {
        el = node;
      }}
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
