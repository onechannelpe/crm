import { type JSX, splitProps } from "solid-js";

import Check from "~/components/icons/check";
import { cn } from "~/lib/utils";

export interface CheckboxProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
}

export function Checkbox(props: CheckboxProps) {
  const [local, others] = splitProps(props, ["class", "label", "id"]);

  return (
    <label class="group inline-flex cursor-pointer items-center gap-2">
      <span class="relative inline-flex items-center">
        <input
          type="checkbox"
          class={cn(
            "peer h-4 w-4 appearance-none rounded-sm border border-primary/85 bg-surface",
            "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
            "checked:border-primary checked:bg-primary",
            "focus-visible:crm-focus-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            local.class,
          )}
          {...others}
        />
        <Check class="pointer-events-none absolute left-1/2 top-1/2 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-primary-foreground peer-checked:block" />
      </span>
      {local.label && (
        <span class="text-sm font-medium leading-none text-foreground transition-colors group-hover:text-foreground/85 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {local.label}
        </span>
      )}
    </label>
  );
}
