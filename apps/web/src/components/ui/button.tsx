import { splitProps, type JSX } from "solid-js";

import {
  Button as DSButton,
  type ButtonProps as DSButtonProps,
} from "./input/button";

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

const variantMap: Record<
  NonNullable<ButtonProps["variant"]>,
  DSButtonProps["variant"]
> = {
  default: "primary",
  destructive: "destructive",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "link",
};

const sizeMap: Record<
  NonNullable<ButtonProps["size"]>,
  DSButtonProps["size"]
> = {
  default: "md",
  sm: "sm",
  lg: "lg",
  icon: "icon",
};

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ["variant", "size"]);
  const variant = variantMap[local.variant ?? "default"];
  const size = sizeMap[local.size ?? "default"];

  return <DSButton variant={variant} size={size} {...others} />;
}
