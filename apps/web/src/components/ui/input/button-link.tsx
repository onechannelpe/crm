import { type JSX, mergeProps, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

import type { ButtonSize, ButtonVariant } from "./button";

import buttonStyles from "./button.module.css";

export interface ButtonLinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink(props: ButtonLinkProps) {
  const merged = mergeProps({ variant: "primary", size: "md" }, props);
  const [local, others] = splitProps(merged, [
    "variant",
    "size",
    "class",
    "href",
    "children",
  ]);

  return (
    <a
      href={local.href}
      class={cn(
        buttonStyles.button,
        buttonStyles[local.size],
        buttonStyles[local.variant],
        local.class,
      )}
      {...others}
    >
      {local.children}
    </a>
  );
}
