import { type JSX, splitProps } from "solid-js";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
    size?: "sm" | "md" | "lg";
}

export function Button(props: ButtonProps) {
    const [local, others] = splitProps(props, ["variant", "size", "class", "children"]);

    const baseClass =
        "inline-flex items-center justify-center font-medium rounded-md " +
        "transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClass = () => {
        switch (local.variant) {
            case "danger":
                return "bg-red-600 text-white hover:bg-red-700";
            case "success":
                return "bg-green-600 text-white hover:bg-green-700";
            case "secondary":
                return "bg-gray-200 text-gray-900 hover:bg-gray-300";
            case "ghost":
                return "hover:bg-gray-100";
            default:
                return "bg-blue-600 text-white hover:bg-blue-700";
        }
    };

    const sizeClass = () => {
        switch (local.size) {
            case "sm":
                return "px-3 py-1.5 text-sm";
            case "lg":
                return "px-6 py-3 text-lg";
            default:
                return "px-4 py-2";
        }
    };

    return (
        <button
            class={`${baseClass} ${variantClass()} ${sizeClass()} ${local.class || ""}`}
            {...others}
        >
            {local.children}
        </button>
    );
}
