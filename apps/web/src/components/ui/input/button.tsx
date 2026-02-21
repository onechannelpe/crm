import { type JSX, mergeProps, splitProps } from "solid-js";

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
type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

const BUTTON_SIZES = ["sm", "md", "lg", "icon"] as const;
type ButtonSize = (typeof BUTTON_SIZES)[number];

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  ]);

  const variantInput = local.variant;
  const variant: ButtonVariant =
    variantInput && isButtonVariant(variantInput) ? variantInput : "primary";

  const sizeInput = local.size;
  const size: ButtonSize =
    sizeInput && isButtonSize(sizeInput) ? sizeInput : "md";

  return (
    <button
      class={cn(styles.button, styles[size], styles[variant], local.class)}
      {...others}
    >
      {local.children}
    </button>
  );
}
