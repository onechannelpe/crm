import { type JSX, splitProps, mergeProps } from "solid-js";

import { cn } from "~/lib/utils";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const BUTTON_VARIANTS = [
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
] as const;
type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

const BUTTON_SIZES = ["default", "sm", "lg", "icon"] as const;
type ButtonSize = (typeof BUTTON_SIZES)[number];

function isButtonVariant(value: string): value is ButtonVariant {
  return BUTTON_VARIANTS.some((variant) => variant === value);
}

function isButtonSize(value: string): value is ButtonSize {
  return BUTTON_SIZES.some((size) => size === value);
}

export function Button(props: ButtonProps) {
  const merged = mergeProps({ variant: "default", size: "default" }, props);
  const [local, others] = splitProps(merged, [
    "variant",
    "size",
    "class",
    "children",
  ]);

  const variants: Record<ButtonVariant, string> = {
    default:
      "rounded-full bg-primary text-primary-foreground hover:bg-primary/92 shadow-sm",
    destructive:
      "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    outline:
      "rounded-full border border-input bg-background/85 shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary:
      "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
    ghost: "rounded-full hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };

  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3.5",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  };

  const variantInput = local.variant;
  const variant: ButtonVariant =
    variantInput && isButtonVariant(variantInput) ? variantInput : "default";
  const sizeInput = local.size;
  const size: ButtonSize =
    sizeInput && isButtonSize(sizeInput) ? sizeInput : "default";

  return (
    <button
      class={cn(
        "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </button>
  );
}
