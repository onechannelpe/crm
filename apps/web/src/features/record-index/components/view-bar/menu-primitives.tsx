import { Show } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import X from "~/components/icons/x";

import sharedStyles from "../../styles/menu.module.css";

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
            autofocus
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
            autofocus
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
