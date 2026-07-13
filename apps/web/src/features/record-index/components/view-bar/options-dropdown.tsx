import { createSignal, For, Show } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import ChevronRight from "~/components/icons/chevron-right";
import Link from "~/components/icons/link";
import List from "~/components/icons/list";
import { Checkbox } from "~/components/ui/input/checkbox";

import { useRecordIndex } from "../../context/record-index-context";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "../../styles/menu.module.css";
import styles from "./view-bar.module.css";

type OptionsContentId = "menu" | "fields";

export function OptionsDropdown(props: { onClose: () => void }) {
  const recordIndex = useRecordIndex();
  const [contentId, setContentId] = createSignal<OptionsContentId>("menu");

  const visibleFieldsCount = () => recordIndex.columns.visibleKeys().size;
  const optionActions = () => recordIndex.definition.actions ?? [];

  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  async function copyViewLink() {
    if (!navigator.clipboard) {
      enqueueErrorSnackBar(
        "El portapapeles no está disponible en este entorno",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      enqueueSuccessSnackBar("Enlace copiado al portapapeles");
      props.onClose();
    } catch (caught) {
      console.error("Failed to copy link", caught);
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
            <div class={sharedStyles.menuListbox}>
              <For each={recordIndex.definition.columns}>
                {(column) => {
                  const isVisible = () =>
                    recordIndex.columns.visibleKeys().has(column.key);

                  return (
                    <Checkbox
                      class={sharedStyles.menuItem}
                      checked={isVisible()}
                      disabled={isVisible() && visibleFieldsCount() === 1}
                      hoverable={false}
                      label={column.label}
                      onChange={() => recordIndex.columns.toggle(column.key)}
                    />
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
        <div class={sharedStyles.menuListbox}>
          <button
            type="button"
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
            <div class={sharedStyles.menuListbox}>
              <For each={optionActions()}>
                {(action) => (
                  <button
                    type="button"
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
