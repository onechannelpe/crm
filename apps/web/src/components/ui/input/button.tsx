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
    "rounded-sm border border-primary/70 bg-primary text-primary-foreground hover:brightness-95",
  secondary:
    "rounded-sm border border-border/70 bg-secondary text-secondary-foreground hover:bg-accent",
  outline:
    "rounded-sm border border-border/70 bg-surface text-foreground hover:bg-muted",
  ghost:
    "rounded-sm border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive:
    "rounded-sm border border-destructive bg-destructive text-destructive-foreground hover:brightness-95",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-8 px-3 text-[13px]",
  lg: "h-10 px-4 text-[13px]",
  icon: "h-8 w-8",
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
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
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
