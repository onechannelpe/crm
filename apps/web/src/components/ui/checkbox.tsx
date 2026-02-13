import { type JSX, splitProps } from "solid-js";
import { cn } from "~/lib/utils";
import { Check } from "lucide-solid";

interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
}

export function Checkbox(props: CheckboxProps) {
    const [local, others] = splitProps(props, ["class", "label", "id"]);

    return (
        <label class="flex items-center space-x-2 cursor-pointer group">
            <div class="relative flex items-center">
                <input
                    type="checkbox"
                    class={cn(
                        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:text-primary-foreground",
                        local.class
                    )}
                    {...others}
                />
                <Check class="absolute h-3 w-3 text-white pointer-events-none hidden peer-checked:block top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            {local.label && (
                <span class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-foreground/80 transition-colors">
                    {local.label}
                </span>
            )}
        </label>
    );
}
