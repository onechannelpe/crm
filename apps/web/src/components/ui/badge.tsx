import { type JSX, splitProps, mergeProps } from "solid-js";
import { cn } from "~/lib/utils";

interface BadgeProps {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
    class?: string;
    children: JSX.Element;
}

export function Badge(props: BadgeProps) {
    const merged = mergeProps({ variant: "default" }, props);
    const [local, others] = splitProps(merged, ["variant", "class", "children"]);

    const variants = {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
    };

    return (
        <div
            class={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                variants[local.variant as keyof typeof variants],
                local.class
            )}
            {...others}
        >
            {local.children}
        </div>
    );
}
