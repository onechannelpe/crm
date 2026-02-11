import type { JSX } from "solid-js";

interface ButtonProps {
  children: JSX.Element;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  class?: string;
}

export default function Button(props: ButtonProps) {
  const baseClass =
    "font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClass = () => {
    switch (props.size) {
      case "sm":
        return "px-3 py-1.5 text-sm";
      case "lg":
        return "px-6 py-3 text-lg";
      default:
        return "px-4 py-2";
    }
  };

  const variantClass = () => {
    switch (props.variant) {
      case "danger":
        return "bg-red-600 text-white hover:bg-red-700";
      case "success":
        return "bg-green-600 text-white hover:bg-green-700";
      case "secondary":
        return "bg-gray-200 text-gray-900 hover:bg-gray-300";
      default:
        return "bg-black text-white hover:bg-gray-800";
    }
  };

  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      class={`${baseClass} ${sizeClass()} ${variantClass()} ${props.class || ""}`}
    >
      {props.children}
    </button>
  );
}
