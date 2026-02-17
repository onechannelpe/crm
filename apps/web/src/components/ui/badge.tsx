import { type JSX, splitProps, mergeProps } from "solid-js";

import { cn } from "~/lib/utils";

interface BadgeProps {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info";
  class?: string;
  children: JSX.Element;
}

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "success",
  "warning",
  "info",
] as const;
type BadgeVariant = (typeof BADGE_VARIANTS)[number];

function isBadgeVariant(value: string): value is BadgeVariant {
  return BADGE_VARIANTS.some((variant) => variant === value);
}

export function Badge(props: BadgeProps) {
  const merged = mergeProps({ variant: "default" }, props);
  const [local, others] = splitProps(merged, ["variant", "class", "children"]);

  const variants: Record<BadgeVariant, string> = {
    default:
      "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "border-border/80 bg-white/75 text-foreground",
    success: "border-transparent bg-[#2b7d56] text-white hover:bg-[#236849]",
    warning: "border-transparent bg-[#a6701f] text-white hover:bg-[#8b5d16]",
    info: "border-transparent bg-[#3b6ea5] text-white hover:bg-[#335f8e]",
  };
  const variantInput = local.variant;
  const variant: BadgeVariant =
    variantInput && isBadgeVariant(variantInput) ? variantInput : "default";

  return (
    <div
      class={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-2",
        variants[variant],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  );
}
