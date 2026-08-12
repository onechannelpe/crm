import { useNavigate } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

import { useHotkey } from "~/browser/hotkey/use-hotkey";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { MenuItem } from "~/components/ui/navigation/menu-item";
import { getNavigableRoutes } from "~/domain/navigation/policy";

import { PanelGroup } from "../../components/group";
import { SidePanelPage } from "../../components/page";
import { SelectableList } from "../../components/selectable-list";
import { useSidePanel } from "../../state/use-side-panel";
import { EmptyState } from "../common/empty-state";

import styles from "./page.module.css";

type ActionItem = {
  id: string;
  label: string;
  icon: typeof ICON_BY_ROUTE.home;
  onAction: () => void;
};

type CommandGroup = {
  label: string;
  items: ActionItem[];
};

export function RootPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthenticatedSession();
  const { searchText, closePanel } = useSidePanel();
  const [selectedId, setSelectedId] = createSignal<string | null>(null);

  const commandGroups = createMemo<CommandGroup[]>(() => {
    const routes = getNavigableRoutes(currentUser().role);
    const grouped = new Map<string, ActionItem[]>();

    for (const route of routes) {
      const label =
        route.section === "primary"
          ? "Accesos rápidos"
          : (route.group ?? "Más");

      const items = grouped.get(label) ?? [];
      const Icon = ICON_BY_ROUTE[route.icon];

      items.push({
        id: route.href,
        label: route.navLabel ?? route.label,
        icon: Icon,
        onAction: () => {
          navigate(route.href);
          closePanel();
        },
      });

      grouped.set(label, items);
    }

    return Array.from(grouped, ([label, items]) => ({
      label,
      items,
    }));
  });

  const filteredGroups = createMemo(() => {
    const query = searchText().toLowerCase();

    if (!query) {
      return commandGroups();
    }

    return commandGroups().flatMap((group) => {
      const items = group.items.filter((item) =>
        item.label.toLowerCase().includes(query),
      );

      return items.length > 0 ? [{ label: group.label, items }] : [];
    });
  });

  const visibleItems = createMemo(() =>
    filteredGroups().flatMap((group) => group.items),
  );

  const itemIds = createMemo(() => visibleItems().map((item) => item.id));

  useHotkey(
    "Enter",
    () => {
      const selectedItem = visibleItems().find(
        (item) => item.id === selectedId(),
      );

      selectedItem?.onAction();
    },
    { allowInInputs: true },
  );

  return (
    <SidePanelPage>
      <div class={styles.commandList}>
        <Show
          when={visibleItems().length > 0}
          fallback={<EmptyState>No se encontraron resultados</EmptyState>}
        >
          <SelectableList
            itemIds={itemIds()}
            selectedId={selectedId()}
            onSelect={setSelectedId}
          >
            <For each={filteredGroups()}>
              {(group) => (
                <PanelGroup label={group.label}>
                  <For each={group.items}>
                    {(item) => (
                      <MenuItem
                        text={item.label}
                        focused={selectedId() === item.id}
                        onClick={item.onAction}
                        onHighlight={() => setSelectedId(item.id)}
                        leftComponent={<item.icon size={16} />}
                      />
                    )}
                  </For>
                </PanelGroup>
              )}
            </For>
          </SelectableList>
        </Show>
      </div>
    </SidePanelPage>
  );
}
