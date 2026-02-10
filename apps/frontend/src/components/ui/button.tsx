import { type JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  as?: string | any; // Allow polymorphism (e.g., passing 'a' for links)
  href?: string;
}

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "class",
    "children",
    "as",
  ]);

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-600 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const baseClass =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClass = variants[local.variant || "primary"];
  const sizeClass = sizes[local.size || "md"];

  return (
    <Dynamic
      component={local.as || (others.href ? "a" : "button")}
      class={`${baseClass} ${variantClass} ${sizeClass} ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}
