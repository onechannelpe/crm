import { For, Match, Show, Switch } from "solid-js";

import { Avatar } from "~/components/ui/display/avatar";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { RecordChip } from "~/components/ui/record-chip/record-chip";
import type {
  SearchResultField,
  SearchResultItem,
} from "~/features/search/model/search-results";

import styles from "./preview-card.module.css";

export function SearchPreviewCard(props: { item: SearchResultItem }) {
  return (
    <div class={styles.card}>
      <header class={styles.header}>
        <Avatar
          imageUrl={null}
          fallback={firstCharacter(props.item.label)}
          placeholderColorSeed={props.item.id}
          size="lg"
          type={props.item.avatarType}
        />

        <div class={styles.headerText}>
          <div class={styles.title}>
            <OverflowingText text={props.item.label} />
          </div>
          <span class={styles.headerLabel}>{props.item.objectLabel}</span>
        </div>
      </header>

      <div class={styles.fieldList}>
        <For each={props.item.fields}>
          {(field) => <PreviewFieldRow field={field} />}
        </For>
      </div>
    </div>
  );
}

function PreviewFieldRow(props: { field: SearchResultField }) {
  return (
    <div class={styles.fieldRow}>
      <div class={styles.fieldLabel}>
        <span class={styles.fieldIcon}>
          <props.field.icon size={16} />
        </span>
        <span class={styles.fieldLabelText}>{props.field.label}</span>
      </div>

      <div class={styles.fieldValue}>
        <Show
          when={props.field.values.length > 0}
          fallback={<span class={styles.fieldEmpty}>—</span>}
        >
          <Switch>
            <Match when={props.field.kind === "text"}>
              <OverflowingText text={props.field.values.join(" · ")} />
            </Match>

            <Match when={props.field.kind === "phones"}>
              <div class={styles.valueRow}>
                <For each={props.field.values}>
                  {(phone) => (
                    <a class={styles.phoneLink} href={`tel:${phone}`}>
                      {phone}
                    </a>
                  )}
                </For>
              </div>
            </Match>

            <Match when={props.field.kind === "chips"}>
              <div class={styles.valueRow}>
                <For each={props.field.values}>
                  {(value) => <RecordChip name={value} shape="square" />}
                </For>
              </div>
            </Match>
          </Switch>
        </Show>
      </div>
    </div>
  );
}

function firstCharacter(name: string): string {
  return (name.trim().charAt(0) || "-").toUpperCase();
}
