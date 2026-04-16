import { createAsync, useAction } from "@solidjs/router";
import {
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

import Search from "~/components/icons/search";
import { LightIconButton } from "~/components/ui/input/light-icon-button";
import { managedExecutivesQuery } from "~/lib/queries/capacity";
import { toAppError } from "~/lib/app-errors";

import { reassignLeadMutation } from "~/features/pipeline/data/mutations";
import { shortName } from "~/lib/users/display-name";

import styles from "./styles.module.css";

export interface UserPickerProps {
  leadId: number;
  currentUserId: number;
  onSelect: (userId: number) => void;
  onClose: () => void;
}

export function UserPicker(props: UserPickerProps) {
  const executives = createAsync(() => managedExecutivesQuery());
  const reassign = useAction(reassignLeadMutation);
  const [search, setSearch] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        props.onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));
  });

  async function handleSelect(userId: number) {
    if (userId === props.currentUserId) {
      props.onClose();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await reassign({ leadId: props.leadId, newExecutiveId: userId });
      props.onSelect(userId);
      props.onClose();
    } catch (err) {
      setError(toAppError(err, "Error al reasignar").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredExecutives = () => {
    const execs = executives() ?? [];
    const searchTerm = search().toLowerCase();
    if (!searchTerm) return execs;
    return execs.filter((e) =>
      e.fullName.toLowerCase().includes(searchTerm),
    );
  };

  return (
    <div ref={containerRef} class={styles.container}>
      <div class={styles.searchWrapper}>
        <Search size={14} />
        <input
          type="text"
          class={styles.searchInput}
          placeholder="Buscar ejecutivo..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          disabled={submitting()}
        />
      </div>
      <Show when={error()}>
        <p class={styles.error}>{error()}</p>
      </Show>
      <ul class={styles.list}>
        <For each={filteredExecutives()}>
          {(exec) => (
            <li>
              <button
                type="button"
                class={styles.item}
                onClick={() => void handleSelect(exec.id)}
                disabled={submitting()}
              >
                <span class={exec.id === props.currentUserId ? styles.current : ""}>
                  {exec.fullName}
                </span>
                <Show when={exec.id === props.currentUserId}>
                  <span class={styles.currentBadge}>Actual</span>
                </Show>
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
