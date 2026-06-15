import { onCleanup, onMount } from "solid-js";

import styles from "../../styles/data-grid.module.css";

// Enter, Tab, and outside dismissal commit the current value. Escape cancels.
// The editor reads from the input ref so it stays uncontrolled after mount.
export function GridTextEditor(props: {
  initialValue: string;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  onCommit: (value: string) => void;
  close: () => void;
}) {
  let inputRef: HTMLInputElement | undefined;
  let cancelled = false;
  let committed = false;

  function commit() {
    if (committed || cancelled) {
      return;
    }
    committed = true;

    const next = (inputRef?.value ?? "").trim();
    if (next !== props.initialValue.trim()) {
      props.onCommit(next);
    }
  }

  onMount(() => {
    inputRef?.focus();
    inputRef?.select();
  });

  // Cleanup covers outside dismissal. Enter and Tab already committed, and
  // Escape marks the edit as cancelled before unmount.
  onCleanup(() => commit());

  return (
    <input
      ref={(el) => (inputRef = el)}
      class={styles.cellEditorInput}
      type="text"
      inputmode={props.inputMode}
      maxlength={props.maxLength}
      value={props.initialValue}
      placeholder={props.placeholder}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          commit();
          props.close();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelled = true;
          props.close();
        }
      }}
    />
  );
}
