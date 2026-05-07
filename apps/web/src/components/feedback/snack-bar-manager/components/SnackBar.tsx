import { A } from "@solidjs/router";
import { createEffect, onCleanup } from "solid-js";

import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import Info from "~/components/icons/info";
import X from "~/components/icons/x";
import { usePresence } from "~/components/ui/animation/use-presence";
import { ProgressBar } from "~/components/ui/feedback/progress-bar";
import { useProgressAnimation } from "~/components/ui/feedback/use-progress-animation";
import { Button } from "~/components/ui/input/button";
import { cn } from "~/lib/utils";

import type { SnackBarInternalItem } from "../states/snackBarInternalComponentState";
import { sanitizeMessageToRenderInSnackbar } from "../utils/sanitizeMessageToRenderInSnackbar";

import styles from "./SnackBar.module.css";

interface SnackBarProps {
  snackBar: SnackBarInternalItem;
  onClose: (id: string) => void;
}

export function SnackBar(props: SnackBarProps) {
  const [isPresent, safeToRemove] = usePresence();
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
      if (!isPresent()) safeToRemove?.();
      return;
    }

    if (isPresent()) {
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
    currentAnimation.onfinish = () => safeToRemove?.();
  });

  onCleanup(cancelCurrentAnimation);

  const progress = useProgressAnimation({
    durationMs: props.snackBar.duration,
    autoPlay:
      props.snackBar.duration > 0 &&
      props.snackBar.progress === undefined,
    initialValue: props.snackBar.progress ?? 100,
    finalValue: 0,
    onComplete: () => props.onClose(props.snackBar.id),
  });
  const progressValue =
    props.snackBar.duration <= 0 ? 100 : progress.value();
  const sanitizedMessage =
    sanitizeMessageToRenderInSnackbar(props.snackBar.message) ?? "";
  const sanitizedDetailedMessage = sanitizeMessageToRenderInSnackbar(
    props.snackBar.detailedMessage,
  );
  const role = props.snackBar.role ?? "status";
  const ariaLive = role === "alert" ? "assertive" : "polite";

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
      onMouseEnter={() => progress.pause()}
      onMouseLeave={() => progress.play()}
      role={role}
      aria-live={ariaLive}
      title={sanitizedMessage}
    >
      <ProgressBar value={progressValue} />
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
          <Info size={16} />
        )}
      </div>

      <div class={styles.content}>
        <p class={styles.message}>{sanitizedMessage}</p>
        {sanitizedDetailedMessage && (
          <p class={styles.details}>{sanitizedDetailedMessage}</p>
        )}
        {props.snackBar.actionText && props.snackBar.actionTo && (
          <A href={props.snackBar.actionTo} class={styles.actionLink}>
            {props.snackBar.actionText}
          </A>
        )}
        {props.snackBar.actionText && props.snackBar.actionOnClick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class={styles.action}
            onClick={props.snackBar.actionOnClick}
          >
            {props.snackBar.actionText}
          </Button>
        )}
        {props.snackBar.onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class={styles.action}
            onClick={props.snackBar.onCancel}
          >
            Cancelar
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => props.onClose(props.snackBar.id)}
        class={styles.dismiss}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
