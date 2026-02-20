import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

export interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select(props: SelectProps) {
  const [local, others] = splitProps(props, [
    "label",
    "error",
    "class",
    "id",
    "children",
  ]);
  const selectId = local.id || createUniqueId();

  return (
    <div class="w-full space-y-2">
      {local.label && (
        <label
          for={selectId}
          class="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {local.label}
          {props.required && <span class="ml-1 text-destructive">*</span>}
        </label>
      )}
      <select
        id={selectId}
        class={cn(
          "peer w-full rounded-2xl border bg-surface px-4 py-2.5 text-sm text-foreground",
          "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
          "focus-visible:crm-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          local.error
            ? "border-destructive focus-visible:shadow-none"
            : "border-input/90",
          local.class,
        )}
        {...others}
      >
        {local.children}
      </select>
      {local.error && (
        <p class="text-xs font-medium text-destructive">{local.error}</p>
      )}
    </div>
  );
}
