import { useNavigate } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";

import Search from "~/components/icons/search";
import { useSession } from "~/components/providers/session-provider";
import { getNavigableRoutes } from "~/lib/nav/nav-policy";
import { cn } from "~/lib/utils";

import styles from "./command-palette.module.css";

type Command = {
  id: string;
  label: string;
  action: () => void;
  group: string;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette(props: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const role = createMemo(() => currentUser().role);

  const commands = createMemo<Command[]>(() =>
    getNavigableRoutes(role()).map((route) => ({
      id: route.id,
      label: `Go to ${route.navLabel ?? route.label}`,
      action: () => navigate(route.href),
      group: "Navigation",
    })),
  );

  const filteredCommands = createMemo(() => {
    const q = query().toLowerCase();
    if (!q) return commands();
    return commands().filter((cmd) => cmd.label.toLowerCase().includes(q));
  });

  createEffect(() => {
    if (!props.open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) =>
          i < filteredCommands().length - 1 ? i + 1 : i,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands()[selectedIndex()];
        if (cmd) {
          cmd.action();
          props.onClose();
        }
      }
    };

    document.addEventListener("keydown", handler);
    onCleanup(() => document.removeEventListener("keydown", handler));
  });

  createEffect(() => {
    if (props.open) {
      setQuery("");
      setSelectedIndex(0);
    }
  });

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <div
        class={styles.overlay}
        onClick={handleOverlayClick}
        role="presentation"
      >
        <div class={styles.dialog} role="dialog" aria-modal="true">
          <div class={styles.searchBox}>
            <Search size={16} class={styles.searchIcon} />
            <input
              type="text"
              class={styles.searchInput}
              placeholder="Search or jump to..."
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              autofocus
            />
          </div>

          <div class={styles.results}>
            <Show
              when={filteredCommands().length > 0}
              fallback={<div class={styles.empty}>No commands found</div>}
            >
              <For each={filteredCommands()}>
                {(cmd, index) => (
                  <button
                    type="button"
                    class={cn(
                      styles.item,
                      selectedIndex() === index() && styles.itemSelected,
                    )}
                    onClick={() => {
                      cmd.action();
                      props.onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index())}
                  >
                    <span class={styles.itemLabel}>{cmd.label}</span>
                    <span class={styles.itemGroup}>{cmd.group}</span>
                  </button>
                )}
              </For>
            </Show>
          </div>

          <div class={styles.footer}>
            <span class={styles.hint}>
              <kbd class={styles.kbd}>↑</kbd>
              <kbd class={styles.kbd}>↓</kbd>
              Navigate
            </span>
            <span class={styles.hint}>
              <kbd class={styles.kbd}>Enter</kbd>
              Select
            </span>
            <span class={styles.hint}>
              <kbd class={styles.kbd}>Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </Show>
  );
}
