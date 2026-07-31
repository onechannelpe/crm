import { clsx } from "clsx";
import { type JSX, mergeProps, splitProps } from "solid-js";

import { Loader } from "~/components/feedback/loading/loader";

import styles from "./button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "compact";

export type ButtonAccent = "default" | "blue";

const ACCENT_CLASS: Record<ButtonAccent, string | undefined> = {
  default: undefined,
  blue: styles.accentBlue,
};

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  accent?: ButtonAccent;
  loading?: boolean;
}

export function Button(props: ButtonProps) {
  const merged = mergeProps(
    {
      variant: "primary" as const,
      size: "md" as const,
      accent: "default" as const,
    },
    props,
  );
  const [local, others] = splitProps(merged, [
    "variant",
    "size",
    "accent",
    "class",
    "children",
    "loading",
  ]);

  return (
    <button
      class={clsx(
        styles.button,
        styles[local.size],
        styles[local.variant],
        ACCENT_CLASS[local.accent],
        local.class,
      )}
      disabled={others.disabled || local.loading}
      {...others}
    >
      <span
        class={clsx(
          styles.loaderSlot,
          !local.loading && styles.loaderSlotHidden,
        )}
        aria-hidden={local.loading ? undefined : "true"}
      >
        {local.loading ? <Loader /> : null}
      </span>
      <span class={styles.content}>{local.children}</span>
    </button>
  );
}
