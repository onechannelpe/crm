import { createSignal, For, onMount, Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { cn } from "~/lib/utils";

import styles from "./styles.module.css";

function editorErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo guardar";
}

export interface InlineFieldEditorProps {
  initialValue: string;
  ariaLabel: string;
  type?: "text" | "number";
  step?: string;
  min?: string;
  placeholder?: string;
  saveLabel?: string;
  onSubmit: (value: string) => Promise<void>;
  onClose: () => void;
}

// A single-value inline editor anchored to a field. Enter saves, Escape and
// click-away cancel, and the popover stays open with an inline message when the
// save fails so the entered value is not lost.
export function InlineFieldEditor(props: InlineFieldEditorProps) {
  const [value, setValue] = createSignal(props.initialValue);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;

  onMount(() => {
    inputRef?.focus();
    inputRef?.select();
  });

  useDismissibleLayer({
    enabled: () => !submitting(),
    onDismiss: () => props.onClose(),
    getContainer: () => containerRef,
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (submitting()) return;
    setError(null);
    setSubmitting(true);
    try {
      await props.onSubmit(value());
      props.onClose();
    } catch (err) {
      setError(editorErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div ref={(el) => (containerRef = el)} class={styles.popover}>
      <form class={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <input
          ref={(el) => (inputRef = el)}
          class={styles.input}
          type={props.type ?? "text"}
          step={props.step}
          min={props.min}
          placeholder={props.placeholder}
          aria-label={props.ariaLabel}
          value={value()}
          onInput={(e) => setValue(e.currentTarget.value)}
          disabled={submitting()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              props.onClose();
            }
          }}
        />
        <Show when={error()}>
          {(message) => <p class={styles.error}>{message()}</p>}
        </Show>
        <div class={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={submitting()}
            onClick={() => props.onClose()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting()}
          >
            {props.saveLabel ?? "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export interface InlineOptionsEditorProps<T extends string> {
  options: readonly T[];
  selected: T;
  ariaLabel: string;
  onSubmit: (value: T) => Promise<void>;
  onClose: () => void;
}

// Same popover shell for a small fixed set of choices (e.g. an enum field).
export function InlineOptionsEditor<T extends string>(
  props: InlineOptionsEditorProps<T>,
) {
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let containerRef: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: () => !submitting(),
    onDismiss: () => props.onClose(),
    getContainer: () => containerRef,
  });

  async function handleSelect(option: T) {
    if (option === props.selected) {
      props.onClose();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await props.onSubmit(option);
      props.onClose();
    } catch (err) {
      setError(editorErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div ref={(el) => (containerRef = el)} class={styles.popover}>
      <Show when={error()}>
        {(message) => <p class={styles.error}>{message()}</p>}
      </Show>
      <ul class={styles.list} aria-label={props.ariaLabel}>
        <For each={props.options}>
          {(option) => (
            <li>
              <button
                type="button"
                class={cn(
                  styles.item,
                  option === props.selected && styles.itemSelected,
                )}
                disabled={submitting()}
                onClick={() => void handleSelect(option)}
              >
                <span>{option}</span>
                <Show when={option === props.selected}>
                  <span class={styles.selectedBadge}>Actual</span>
                </Show>
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
