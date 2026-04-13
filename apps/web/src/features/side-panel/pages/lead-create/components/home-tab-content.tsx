import { For, Show } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import ChevronRight from "~/components/icons/chevron-right";
import Plus from "~/components/icons/plus";

import { FIELD_ROWS, RELATION_WIDGETS } from "./constants";

import styles from "../page.module.css";

type HomeTabContentProps = {
  ruc?: string;
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  onRucInput?: (value: string) => void;
  onSubmit?: () => void;
};

export function HomeTabContent(props: HomeTabContentProps) {
  return (
    <div class={styles.homeContent}>
      <section class={styles.widget}>
        <div class={styles.widgetHeader}>
          <h3 class={styles.widgetTitle}>Campos</h3>
        </div>
        <button type="button" class={styles.sectionHeader}>
          <span>General</span>
          <ChevronDown size={14} />
        </button>

        <div class={styles.fieldTable}>
          <For each={FIELD_ROWS}>
            {(field) => (
              <div class={styles.fieldRow}>
                <div class={styles.fieldLabel}>
                  <div class={styles.fieldIcon}>
                    <field.icon size={16} />
                  </div>
                  <span>{field.label}</span>
                </div>
                <div class={styles.fieldValue}>
                  {field.key === "ruc" ? (
                    <input
                      value={props.ruc ?? ""}
                      onInput={(event) =>
                        props.onRucInput?.(event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          props.onSubmit?.();
                        }
                      }}
                      placeholder="Ingresa el RUC"
                      class={styles.fieldInput}
                      aria-label="RUC"
                    />
                  ) : (
                    <span class={styles.fieldTextValue}>
                      {field.key === "razonSocial"
                        ? (props.razonSocial ?? "")
                        : field.key === "address"
                          ? (props.address ?? "")
                          : (field.value ?? "")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      <For each={RELATION_WIDGETS}>
        {(widget) => (
          <section class={styles.widget}>
            <div class={styles.widgetHeader}>
              <h3 class={styles.widgetTitle}>{widget.title}</h3>
              <div class={styles.widgetActions}>
                {widget.showSeeAll && (
                  <button type="button" class={styles.seeAllButton}>
                    <span>See all</span>
                    <ChevronRight size={14} />
                  </button>
                )}
                <button type="button" class={styles.widgetOptionsButton}>
                  ...
                </button>
              </div>
            </div>

            <div class={styles.relationRow}>
              <span>
                {widget.title === "Bootstrap desde Engine"
                  ? (props.engineStatus ?? "")
                  : "Se encola al registrar el lead"}
              </span>
              <Show when={widget.title === "Bootstrap desde Engine"}>
                <button
                  type="button"
                  class={styles.plusButton}
                  onClick={() => props.onSubmit?.()}
                >
                  <Plus size={14} />
                </button>
              </Show>
            </div>
          </section>
        )}
      </For>
    </div>
  );
}
