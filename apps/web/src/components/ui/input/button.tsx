import { type JSX, mergeProps, splitProps } from "solid-js";

import { Loader } from "~/components/feedback/loader";
import { cn } from "~/lib/utils";

import styles from "./button.module.css";

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

const BUTTON_SIZES = ["sm", "md", "lg", "icon", "compact"] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

function isButtonVariant(value: string): value is ButtonVariant {
  return BUTTON_VARIANTS.some((variant) => variant === value);
}

function isButtonSize(value: string): value is ButtonSize {
  return BUTTON_SIZES.some((size) => size === value);
}

export function Button(props: ButtonProps) {
  const merged = mergeProps({ variant: "primary", size: "md" }, props);
  const [local, others] = splitProps(merged, [
    "variant",
    "size",
    "class",
    "children",
    "loading",
  ]);

  const resolvedVariant = () => {
    const v = local.variant;
    return v && isButtonVariant(v) ? v : "primary";
  };
  const resolvedSize = () => {
    const s = local.size;
    return s && isButtonSize(s) ? s : "md";
  };

  return (
    <button
      class={cn(
        styles.button,
        styles[resolvedSize()],
        styles[resolvedVariant()],
        local.class,
      )}
      disabled={others.disabled || local.loading}
      {...others}
    >
      <span
        class={cn(styles.loaderSlot, !local.loading && styles.loaderSlotHidden)}
        aria-hidden={local.loading ? undefined : "true"}
      >
        {local.loading ? <Loader /> : null}
      </span>
      <span class={styles.content}>{local.children}</span>
    </button>
  );
}
