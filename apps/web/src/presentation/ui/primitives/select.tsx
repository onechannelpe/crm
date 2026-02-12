import { type JSX, For, splitProps, createUniqueId } from "solid-js";

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select(props: SelectProps) {
  const [local, others] = splitProps(props, ["label", "error", "options", "class", "id"]);
  const selectId = local.id || createUniqueId();

  return (
    <div class="w-full">
      {local.label && (
        <label for={selectId} class="block text-sm font-medium text-gray-700 mb-1">
          {local.label}
          {props.required && <span class="text-red-600 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${local.error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
          } disabled:bg-gray-100 disabled:cursor-not-allowed ${local.class || ""}`}
        {...others}
      >
        <For each={local.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
      {local.error && <p class="text-red-600 text-sm mt-1">{local.error}</p>}
    </div>
  );
}
