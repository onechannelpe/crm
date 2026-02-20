import { mergeProps, splitProps, type JSX } from "solid-js";

import { cn } from "~/lib/utils";

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "success",
  "warning",
  "info",
] as const;
type BadgeVariant = (typeof BADGE_VARIANTS)[number];

export interface BadgeProps {
  variant?: BadgeVariant;
  class?: string;
  children: JSX.Element;
}

function isBadgeVariant(value: string): value is BadgeVariant {
  return BADGE_VARIANTS.some((variant) => variant === value);
}

const variantClassName: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border/85 bg-surface text-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
  success: "border-transparent bg-success text-success-foreground",
  warning: "border-transparent bg-warning text-warning-foreground",
  info: "border-transparent bg-info text-info-foreground",
};

export function Badge(props: BadgeProps) {
  const merged = mergeProps({ variant: "default" }, props);
  const [local, others] = splitProps(merged, ["variant", "class", "children"]);

  const variantInput = local.variant;
  const variant: BadgeVariant =
    variantInput && isBadgeVariant(variantInput) ? variantInput : "default";

  return (
    <div
      class={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        "focus-visible:crm-focus-ring",
        variantClassName[variant],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  );
}
