import { type JSX, splitProps } from "solid-js";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, ["label", "error", "class"]);

  return (
    <div class="w-full">
      {local.label && (
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {local.label}
          {props.required && <span class="text-red-600 ml-1">*</span>}
        </label>
      )}
      <input
        class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          local.error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        } disabled:bg-gray-100 disabled:cursor-not-allowed ${local.class || ""}`}
        {...others}
      />
      {local.error && <p class="text-red-600 text-sm mt-1">{local.error}</p>}
    </div>
  );
}
