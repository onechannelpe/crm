import { createAsync, useAction } from "@solidjs/router";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

import Search from "~/components/icons/search";
import { reassignLeadMutation } from "~/features/pipeline/data/mutations";
import { assignableExecutivesQuery } from "~/features/pipeline/data/queries";
import { toAppError } from "~/lib/app-errors";

import styles from "./styles.module.css";

export interface UserPickerProps {
  leadId: number;
  currentUserId: number;
  onSelect: () => void;
  onClose: () => void;
}

export function UserPicker(props: UserPickerProps) {
  const [search, setSearch] = createSignal("");
  const executives = createAsync(() =>
    assignableExecutivesQuery({
      leadId: props.leadId,
      search: search(),
      limit: 50,
    }),
  );
  const reassign = useAction(reassignLeadMutation);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let containerRef: HTMLDivElement | undefined;

  const setRef = (el: HTMLDivElement) => {
    containerRef = el;
  };

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target;
      if (
        containerRef &&
        target instanceof Node &&
        !containerRef.contains(target)
      ) {
        props.onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() =>
      document.removeEventListener("mousedown", handleClickOutside),
    );
  });

  async function handleSelect(executiveId: number) {
    if (executiveId === props.currentUserId) {
      props.onClose();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await reassign({ leadId: props.leadId, newExecutiveId: executiveId });
      props.onSelect();
      props.onClose();
    } catch (err) {
      setError(toAppError(err, "Error al reasignar").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={setRef} class={styles.container}>
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
        <For each={executives() ?? []}>
          {(exec) => (
            <li>
              <button
                type="button"
                class={styles.item}
                onClick={() => void handleSelect(exec.id)}
                disabled={submitting()}
              >
                <span
                  class={exec.id === props.currentUserId ? styles.current : ""}
                >
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
