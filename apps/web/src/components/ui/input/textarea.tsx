import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea(props: TextareaProps) {
  const [local, others] = splitProps(props, ["label", "error", "class", "id"]);
  const textareaId = local.id || createUniqueId();

  return (
    <div class="w-full space-y-2">
      {local.label && (
        <label
          for={textareaId}
          class="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {local.label}
          {props.required && <span class="ml-1 text-destructive">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
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
      />
      {local.error && (
        <p class="text-xs font-medium text-destructive">{local.error}</p>
      )}
    </div>
  );
}
