import { For, Show } from "solid-js";

import type { DataGridColumn } from "~/features/data-grid";

import type { LeadRow } from "./columns";

import styles from "./styles.module.css";
import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function LeadsRecordIndexDraftRow(props: {
  columns: DataGridColumn<LeadRow>[];
  draftRuc: string;
  error: string | null;
  gridTemplateColumns: string;
  onCancel: () => void;
  onDraftRucInput: (value: string) => void;
  onSubmit: () => void;
  stickyColumnIndex: number;
  stickyLeft: number;
  submitting: boolean;
}) {
  return (
    <div
      class={sharedStyles.draftRow}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      <div class={`${sharedStyles.bodyCell} ${sharedStyles.checkboxCell}`} />
      <For each={props.columns}>
        {(column, index) => (
          <div
            class={`${sharedStyles.bodyCell} ${styles.draftCell} ${index() === props.stickyColumnIndex ? sharedStyles.stickyCell : ""}`}
            style={
              index() === props.stickyColumnIndex
                ? { left: `${props.stickyLeft}px` }
                : undefined
            }
          >
            <Show
              when={column.key === "ruc"}
              fallback={
                <span class={styles.placeholderText}>
                  Se completa al guardar
                </span>
              }
            >
              <form
                class={styles.inlineComposer}
                onSubmit={(event) => {
                  event.preventDefault();
                  props.onSubmit();
                }}
              >
                <input
                  autofocus
                  class={styles.inlineInput}
                  inputMode="numeric"
                  placeholder="Ingresa el RUC"
                  value={props.draftRuc}
                  onInput={(event) =>
                    props.onDraftRucInput(event.currentTarget.value)
                  }
                />
                <div class={styles.inlineComposerActions}>
                  <button
                    type="submit"
                    class={styles.inlineSaveButton}
                    disabled={
                      props.submitting || props.draftRuc.trim().length === 0
                    }
                  >
                    {props.submitting ? "Guardando..." : "Save"}
                  </button>
                  <button
                    type="button"
                    class={styles.inlineCancelButton}
                    disabled={props.submitting}
                    onClick={props.onCancel}
                  >
                    Cancel
                  </button>
                </div>
                <Show when={props.error}>
                  {(message) => (
                    <span class={styles.errorText}>{message()}</span>
                  )}
                </Show>
              </form>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}
