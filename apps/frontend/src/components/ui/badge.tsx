import { type JSX, splitProps } from "solid-js";

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  children: JSX.Element;
  variant?: "default" | "success" | "warning" | "error" | "neutral";
}

export function Badge(props: BadgeProps) {
  const [local, others] = splitProps(props, ["children", "class", "variant"]);

  const variants = {
    default: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-800",
  };

  const variantClass = variants[local.variant || "default"];

  return (
    <span
      class={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${variantClass} ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </span>
  );
}
