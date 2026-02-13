import { type JSX, splitProps, createUniqueId } from "solid-js";
import { cn } from "~/lib/utils";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input(props: InputProps) {
    const [local, others] = splitProps(props, ["label", "error", "class", "id"]);
    const inputId = local.id || createUniqueId();

    return (
        <div class="w-full space-y-2">
            {local.label && (
                <label
                    for={inputId}
                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {local.label}
                    {props.required && <span class="text-destructive ml-1">*</span>}
                </label>
            )}
            <input
                id={inputId}
                class={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                    local.error && "border-destructive focus-visible:ring-destructive",
                    local.class
                )}
                {...others}
            />
            {local.error && <p class="text-xs font-medium text-destructive">{local.error}</p>}
        </div>
    );
}
