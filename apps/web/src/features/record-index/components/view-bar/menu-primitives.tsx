import { Show } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import X from "~/components/icons/x";
import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function DropdownMenuHeader(props: {
  onClose: () => void;
  title: string;
  onBack?: () => void;
}) {
  return (
    <div class={sharedStyles.menuHeader}>
      <Show
        when={props.onBack}
        fallback={
          <button
            type="button"
            class={sharedStyles.menuHeaderCloseButton}
            aria-label="Cerrar"
            onClick={props.onClose}
          >
            <X size={14} />
          </button>
        }
      >
        {(onBack) => (
          <button
            type="button"
            class={sharedStyles.menuHeaderCloseButton}
            aria-label="Volver"
            onClick={onBack()}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </Show>
      <span class={sharedStyles.menuHeaderTitle}>{props.title}</span>
    </div>
  );
}

export function parseSortDirection(value: string | undefined): "asc" | "desc" {
  if (value?.endsWith("_asc")) {
    return "asc";
  }
  return "desc";
}
