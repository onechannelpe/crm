import { createMemo, createSignal, For, Show } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import ChevronRight from "~/components/icons/chevron-right";
import Link from "~/components/icons/link";
import List from "~/components/icons/list";

import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";
import { DropdownMenuHeader } from "./menu-primitives";
import type { OptionsContentId } from "./types";

import styles from "./view-bar.module.css";
import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function OptionsDropdown(props: { onClose: () => void }) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();
  const [contentId, setContentId] = createSignal<OptionsContentId>("menu");

  const visibleFieldsCount = () => model.columns.visibleColumnKeys().size;
  const optionActions = () => setup.actions ?? [];

  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  async function copyViewLink() {
    if (!navigator.clipboard) {
      enqueueErrorSnackBar("El portapapeles no está disponible en este entorno");
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      enqueueSuccessSnackBar("Enlace copiado al portapapeles");
      props.onClose();
    } catch (err) {
      console.error("Failed to copy link", err);
      enqueueErrorSnackBar("Error al copiar el enlace");
    }
  }

  return (
    <Show
      when={contentId() === "menu"}
      fallback={
        <>
          <DropdownMenuHeader
            title="Columnas"
            onClose={props.onClose}
            onBack={() => setContentId("menu")}
          />
          <div class={sharedStyles.menuScrollable}>
            <div class={sharedStyles.menuGroupLabel}>Columnas de la tabla</div>
            <div class={sharedStyles.menuListbox} role="menu">
              <For each={setup.columns}>
                {(column) => {
                  const isVisible = createMemo(() =>
                    model.columns.visibleColumnKeys().has(column.key),
                  );

                  return (
                    <button
                      type="button"
                      class={sharedStyles.menuItem}
                      role="menuitemcheckbox"
                      data-active={isVisible() ? "true" : "false"}
                      aria-checked={isVisible() ? "true" : "false"}
                      onClick={() => model.columns.toggleColumn(column.key)}
                    >
                      <input
                        checked={isVisible()}
                        class={sharedStyles.menuCheckbox}
                        type="checkbox"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <span>{column.label}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </>
      }
    >
      <DropdownMenuHeader title="Opciones" onClose={props.onClose} />
      <div class={sharedStyles.menuScrollable}>
        <div class={sharedStyles.menuListbox} role="menu">
          <button
            type="button"
            role="menuitem"
            class={sharedStyles.menuItem}
            onClick={() => setContentId("fields")}
          >
            <span class={sharedStyles.menuItemIcon}>
              <List size={16} />
            </span>
            <span class={styles.columnLabel}>Columnas</span>
            <span class={styles.visibleCount}>{visibleFieldsCount()}</span>
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            role="menuitem"
            class={sharedStyles.menuItem}
            onClick={() => {
              void copyViewLink();
            }}
          >
            <span class={sharedStyles.menuItemIcon}>
              <Link size={16} />
            </span>
            <span>Copiar enlace de vista</span>
          </button>
        </div>

        <Show when={optionActions().length > 0}>
          <>
            <div class={sharedStyles.menuSeparator} />
            <div class={sharedStyles.menuGroupLabel}>Acciones</div>
            <div class={sharedStyles.menuListbox} role="menu">
              <For each={optionActions()}>
                {(action) => (
                  <button
                    type="button"
                    role="menuitem"
                    class={sharedStyles.menuItem}
                    onClick={() => {
                      props.onClose();
                      void action.onClick();
                    }}
                  >
                    {action.label}
                  </button>
                )}
              </For>
            </div>
          </>
        </Show>
      </div>
    </Show>
  );
}
