import { Dynamic, For, Show, createSignal, onCleanup, onMount } from "solid-js";
import X from "~/components/icons/x";
import { cn } from "~/lib/utils";
import { useSidePanelContextChips } from "../hooks/use-side-panel-context-chips";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelBackButton } from "./side-panel-back-button";
import { SidePanelPageInfo } from "./side-panel-page-info";
import styles from "./side-panel-top-bar.module.css";

export function SidePanelTopBar() {
  const { navigationStack, currentPage, closePanel, searchText, setSearchText } = useSidePanel();
  const chips = useSidePanelContextChips();

  const mq = window.matchMedia("(max-width: 768px)");
  const [isMobile, setIsMobile] = createSignal(mq.matches);

  onMount(() => {
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  const showBackButton = () => navigationStack().length > 1;
  const showCloseButton = () => navigationStack().length === 1 && !isMobile();
  const showSearch = () => {
    const key = currentPage()?.key;
    return key === "root" || key === "search";
  };

  return (
    <div class={cn(styles.topBar, isMobile() && styles.topBarMobile)}>
      <Show when={showBackButton()}>
        <SidePanelBackButton visible={showBackButton()} />
      </Show>
      <Show when={showCloseButton()}>
        <button
          type="button"
          class={styles.closeButton}
          onClick={closePanel}
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </Show>

      <div class={styles.rightSlot}>
        <Show when={showSearch()} fallback={<SidePanelPageInfo />}>
          <input
            type="text"
            class={styles.searchInput}
            placeholder="Search or type a command..."
            value={searchText()}
            onInput={(e) => setSearchText(e.currentTarget.value)}
          />
        </Show>
        {/* context chips: wired in task 10 */}
        <For each={chips()}>
          {(chip) => (
            <Show
              when={chip.onClick}
              fallback={
                <span style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "var(--font-size-caption)", color: "var(--foreground-secondary)" }}>
                  <Dynamic component={chip.page.icon} size={12} />
                  {chip.page.title}
                </span>
              }
            >
              <button
                type="button"
                onClick={chip.onClick}
                style={{ display: "flex", "align-items": "center", gap: "4px", background: "transparent", border: "none", cursor: "pointer", "font-size": "var(--font-size-caption)", color: "var(--foreground-tertiary)", padding: "0 2px" }}
              >
                <Dynamic component={chip.page.icon} size={12} />
                {chip.page.title}
              </button>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
