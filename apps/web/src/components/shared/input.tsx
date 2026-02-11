import { createSignal } from "solid-js";

interface InputProps {
  name: string;
  id?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  error?: string;
  label?: string;
  disabled?: boolean;
  onInput?: (value: string) => void;
  class?: string;
}

export default function Input(props: InputProps) {
  const [touched, setTouched] = createSignal(false);
  const inputId = () => props.id || props.name;

  return (
    <div class="w-full">
      {props.label && (
        <label
          for={inputId()}
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          {props.label}
          {props.required && <span class="text-red-600 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId()}
        name={props.name}
        type={props.type || "text"}
        placeholder={props.placeholder}
        value={props.value}
        required={props.required}
        disabled={props.disabled}
        onInput={(e) => {
          setTouched(true);
          props.onInput?.(e.currentTarget.value);
        }}
        onBlur={() => setTouched(true)}
        class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
          touched() && props.error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-black"
        } ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""} ${props.class || ""}`}
      />
      {touched() && props.error && (
        <p class="text-red-600 text-sm mt-1">{props.error}</p>
      )}
    </div>
  );
}
