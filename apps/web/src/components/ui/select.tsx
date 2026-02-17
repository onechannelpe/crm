import { type JSX, splitProps, createUniqueId } from "solid-js";

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
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
    <div class="w-full">
      {local.label && (
        <label
          for={selectId}
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          {local.label}
          {props.required && <span class="text-red-600 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        class={`w-full rounded-2xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
          local.error
            ? "border-red-500 focus:ring-red-500"
            : "border-input/85 bg-white/75 focus:ring-ring/70"
        } disabled:bg-gray-100 disabled:cursor-not-allowed ${local.class || ""}`}
        {...others}
      >
        {local.children}
      </select>
      {local.error && <p class="text-red-600 text-sm mt-1">{local.error}</p>}
    </div>
  );
}
