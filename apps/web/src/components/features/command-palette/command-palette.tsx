import { useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import Search from "~/components/icons/search";
import { useSession } from "~/components/providers/session-provider";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
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
      label: `Ir a ${route.navLabel ?? route.label}`,
      action: () => navigate(route.href),
      group: "Navegación",
    })),
  );

  const filteredCommands = createMemo(() => {
    const q = query().toLowerCase();
    if (!q) return commands();
    return commands().filter((cmd) => cmd.label.toLowerCase().includes(q));
  });

  const isOpen = () => props.open;

  useHotkey("Escape", () => props.onClose(), {
    enabled: isOpen,
    allowInInputs: true,
  });
  useHotkey(
    "ArrowDown",
    () =>
      setSelectedIndex((i) => (i < filteredCommands().length - 1 ? i + 1 : i)),
    {
      enabled: isOpen,
      allowInInputs: true,
    },
  );
  useHotkey("ArrowUp", () => setSelectedIndex((i) => (i > 0 ? i - 1 : 0)), {
    enabled: isOpen,
    allowInInputs: true,
  });
  useHotkey(
    "Enter",
    () => {
      const cmd = filteredCommands()[selectedIndex()];
      if (cmd) {
        cmd.action();
        props.onClose();
      }
    },
    { enabled: isOpen, allowInInputs: true },
  );

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
              placeholder="Buscar o ir a..."
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              autofocus
            />
          </div>

          <div class={styles.results}>
            <Show
              when={filteredCommands().length > 0}
              fallback={
                <div class={styles.empty}>No se encontraron comandos</div>
              }
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
              Navegar
            </span>
            <span class={styles.hint}>
              <kbd class={styles.kbd}>Enter</kbd>
              Seleccionar
            </span>
            <span class={styles.hint}>
              <kbd class={styles.kbd}>Esc</kbd>
              Cerrar
            </span>
          </div>
        </div>
      </div>
    </Show>
  );
}
