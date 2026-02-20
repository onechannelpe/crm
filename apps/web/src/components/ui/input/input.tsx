import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
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
          class="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {local.label}
          {props.required && <span class="ml-1 text-destructive">*</span>}
        </label>
      )}
      <input
        id={inputId}
        class={cn(
          "peer flex h-11 w-full rounded-2xl border border-input/90 bg-surface px-4 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
          "focus-visible:crm-focus-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          local.error && "border-destructive focus-visible:shadow-none",
          local.class,
        )}
        {...others}
      />
      {local.error && (
        <p class="text-xs font-medium text-destructive">{local.error}</p>
      )}
    </div>
  );
}
