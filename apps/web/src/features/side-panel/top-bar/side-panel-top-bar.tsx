import { Show, createSignal, onCleanup, onMount } from "solid-js";
import X from "~/components/icons/x";
import { cn } from "~/lib/utils";
import { useSidePanel } from "../state/use-side-panel";
import { SidePanelBackButton } from "./side-panel-back-button";
import { SidePanelPageInfo } from "./side-panel-page-info";
import styles from "./side-panel-top-bar.module.css";

export function SidePanelTopBar() {
  const { navigationStack, currentPage, closePanel, searchText, setSearchText } = useSidePanel();

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
      </div>
    </div>
  );
}
