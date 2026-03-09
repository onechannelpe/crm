import {
  createSignal,
  createUniqueId,
  Show,
  type JSX,
  splitProps,
} from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./field.module.css";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, [
    "label",
    "error",
    "class",
    "id",
    "type",
  ]);
  const inputId = local.id || createUniqueId();
  const errorId = `${inputId}-error`;
  const describedBy = () => {
    const existing = others["aria-describedby"];
    if (!local.error) return existing;
    return typeof existing === "string" && existing.length > 0
      ? `${existing} ${errorId}`
      : errorId;
  };
  const isPassword = local.type === "password";
  const [showPassword, setShowPassword] = createSignal(false);

  return (
    <div class={styles.field}>
      {local.label && (
        <label for={inputId} class={styles.label}>
          {local.label}
          {props.required && <span class={styles.required}>*</span>}
        </label>
      )}
      <div class={isPassword ? styles.inputWrap : undefined}>
        <input
          id={inputId}
          aria-describedby={describedBy()}
          type={
            isPassword ? (showPassword() ? "text" : "password") : local.type
          }
          class={cn(
            styles.control,
            isPassword ? styles.controlWithReveal : undefined,
            local.error ? styles.errorControl : undefined,
            local.class,
          )}
          {...others}
        />
        <Show when={isPassword}>
          <button
            type="button"
            class={styles.revealButton}
            aria-label={
              showPassword()
                ? "Ocultar contraseña"
                : "Mostrar contraseña como texto visible. Advertencia: esto mostrará tu contraseña en la pantalla."
            }
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword() ? (
              // eye-off icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // eye icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </Show>
      </div>
      {local.error && (
        <p id={errorId} class={styles.errorText}>
          {local.error}
        </p>
      )}
    </div>
  );
}
