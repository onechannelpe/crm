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
    const grouped = new Map<string, ActionItem[]>();
    const routes = getNavigableRoutes(currentUser().role);

    for (const route of routes) {
      const groupLabel =
        route.section === "primary"
          ? "Accesos rápidos"
          : (route.group ?? "Más");
      const existingItems = grouped.get(groupLabel) ?? [];
      const Icon = ICON_BY_ROUTE[route.icon];

      existingItems.push({
        id: route.href,
        label: route.navLabel ?? route.label,
        icon: Icon,
        onAction: () => {
          navigate(route.href);
          closePanel();
        },
      });

      grouped.set(groupLabel, existingItems);
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
    return commandGroups()
      .map((group) =>
        Object.assign({}, group, {
          items: group.items.filter((item) =>
            item.label.toLowerCase().includes(query),
          ),
        }),
      )
      .filter((group) => group.items.length > 0);
  });

  const visibleItems = createMemo(() =>
    filteredGroups().flatMap((group) => group.items),
  );
  const itemIds = createMemo(() => visibleItems().map((item) => item.id));

  useHotkey(
    "Enter",
    () => {
      visibleItems()
        .find((item) => item.id === selectedId())
        ?.onAction();
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
