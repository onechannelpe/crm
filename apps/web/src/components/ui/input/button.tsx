import { type JSX, mergeProps, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

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

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "rounded-full bg-primary text-primary-foreground shadow-elevation-1 hover:bg-primary/92",
  secondary:
    "rounded-full bg-secondary text-secondary-foreground shadow-elevation-1 hover:bg-secondary/82",
  outline:
    "rounded-full border border-input/90 bg-surface text-foreground shadow-elevation-1 hover:bg-accent hover:text-accent-foreground",
  ghost:
    "rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive:
    "rounded-full bg-destructive text-destructive-foreground shadow-elevation-1 hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-8 text-sm",
  icon: "h-10 w-10",
};

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
      class={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        "ring-offset-background focus-visible:crm-focus-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClassName[variant],
        sizeClassName[size],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </button>
  );
}
