import { onCleanup, onMount } from "solid-js";

import { createTextEditorState } from "./text-editor-state";

import styles from "../../styles/data-grid.module.css";

export function GridTextEditor(props: {
  initialValue: string;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  onCommit: (value: string) => void;
  close: () => void;
}) {
  let inputRef: HTMLInputElement | undefined;
  const state = createTextEditorState(props.initialValue, props.onCommit);

  onMount(() => {
    inputRef?.focus();
    inputRef?.select();
  });

  // Cleanup covers outside dismissal. Enter and Tab already committed, and
  // Escape marks the edit as cancelled before unmount.
  onCleanup(() => state.commit(inputRef?.value ?? ""));

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
          state.commit(inputRef?.value ?? "");
          props.close();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          state.cancel();
          props.close();
        }
      }}
    />
  );
}
