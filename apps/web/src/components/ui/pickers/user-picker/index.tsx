import { createAsync } from "@solidjs/router";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

import Search from "~/components/icons/search";
import type { UserId } from "~/server/shared/ids";

import styles from "./styles.module.css";

export type UserPickerOption = {
  id: UserId;
  fullName: string;
};

export interface UserPickerProps {
  currentUserId: UserId;
  fetchUsers: (search: string) => Promise<UserPickerOption[]>;
  onSelect: (id: UserId) => Promise<void>;
  onClose: () => void;
}

export function UserPicker(props: UserPickerProps) {
  const [search, setSearch] = createSignal("");
  const [debouncedSearch, setDebouncedSearch] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let containerRef: HTMLDivElement | undefined;

  const users = createAsync(() => props.fetchUsers(debouncedSearch()));

  function handleSearchInput(value: string) {
    setSearch(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setDebouncedSearch(value), 150);
  }

  onCleanup(() => clearTimeout(debounceTimer));

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

  async function handleSelect(userId: UserId) {
    if (userId === props.currentUserId) {
      props.onClose();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await props.onSelect(userId);
      props.onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al seleccionar usuario",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={(el) => (containerRef = el)} class={styles.container}>
      <div class={styles.searchWrapper}>
        <Search size={14} />
        <input
          type="text"
          class={styles.searchInput}
          placeholder="Buscar..."
          aria-label="Buscar usuario"
          value={search()}
          onInput={(e) => handleSearchInput(e.currentTarget.value)}
          disabled={submitting()}
        />
      </div>
      <Show when={error()}>
        <p class={styles.error}>{error()}</p>
      </Show>
      <ul class={styles.list}>
        <Show
          when={users() !== undefined}
          fallback={<li class={styles.loadingHint}>Buscando...</li>}
        >
          <For each={users() ?? []}>
            {(user) => (
              <li>
                <button
                  type="button"
                  class={styles.item}
                  onClick={() => void handleSelect(user.id)}
                  disabled={submitting()}
                >
                  <span
                    class={
                      user.id === props.currentUserId ? styles.current : ""
                    }
                  >
                    {user.fullName}
                  </span>
                  <Show when={user.id === props.currentUserId}>
                    <span class={styles.currentBadge}>Actual</span>
                  </Show>
                </button>
              </li>
            )}
          </For>
        </Show>
      </ul>
    </div>
  );
}
