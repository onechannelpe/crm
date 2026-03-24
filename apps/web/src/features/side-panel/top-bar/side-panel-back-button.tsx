import { Dynamic, For, Portal, Show, createSignal } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import { cn } from "~/lib/utils";

import { useSidePanel } from "../state/use-side-panel";

import styles from "./side-panel-back-button.module.css";

type SidePanelBackButtonProps = {
  visible: boolean;
};

export function SidePanelBackButton(props: SidePanelBackButtonProps) {
  const { navigationStack, goBack, navigateToStackIndex } = useSidePanel();
  const [showDropdown, setShowDropdown] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;

  function openDropdown(e: MouseEvent) {
    e.preventDefault();
    setShowDropdown(true);

    function handleClickOutside() {
      setShowDropdown(false);
      document.removeEventListener("click", handleClickOutside);
    }
    // Defer listener to avoid the current click closing the dropdown immediately
    setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
  }

  const dropdownItems = () => navigationStack().slice(0, -1);

  return (
    <div
      class={cn(
        styles.buttonWrapper,
        props.visible && styles.buttonWrapperVisible,
      )}
    >
      <button
        ref={(el) => {
          buttonRef = el;
        }}
        type="button"
        class={styles.button}
        onClick={goBack}
        onContextMenu={openDropdown}
        aria-label="Go back"
      >
        <ChevronLeft size={16} />
      </button>

      <Show when={showDropdown() && dropdownItems().length > 0}>
        <Portal mount={document.body}>
          <div
            class={styles.dropdown}
            style={{
              top: `${(buttonRef?.getBoundingClientRect().bottom ?? 0) + 4}px`,
              left: `${buttonRef?.getBoundingClientRect().left ?? 0}px`,
            }}
          >
            <For each={dropdownItems()}>
              {(page, index) => (
                <button
                  type="button"
                  class={styles.dropdownItem}
                  onClick={() => {
                    navigateToStackIndex(index());
                    setShowDropdown(false);
                  }}
                >
                  <Dynamic component={page.icon} size={14} />
                  {page.title}
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
