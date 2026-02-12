import type { JSX } from "solid-js";

interface BadgeProps {
    variant?: "success" | "warning" | "danger" | "info" | "neutral";
    children: JSX.Element;
}

export function Badge(props: BadgeProps) {
    const variantClass = () => {
        switch (props.variant) {
            case "success":
                return "bg-green-100 text-green-800";
            case "warning":
                return "bg-yellow-100 text-yellow-800";
            case "danger":
                return "bg-red-100 text-red-800";
            case "info":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClass()}`}>
            {props.children}
        </span>
    );
}
