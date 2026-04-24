import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Portal } from "solid-js/web";

import BrowserMaximize from "~/components/icons/browser-maximize";
import Export from "~/components/icons/export";
import Heart from "~/components/icons/heart";
import Mail from "~/components/icons/mail";
import Trash from "~/components/icons/trash";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import {
  FooterButtonPrimary,
  FooterButtonSecondary,
  FooterDots,
  FooterIcon,
  FooterLabel,
  FooterShortcut,
  PanelFooter,
} from "~/features/side-panel/components/panel-footer";
import { useScopedHotkey } from "~/features/side-panel/core/hotkeys/create-scoped-hotkey";

import styles from "./footer.module.css";

type FooterProps = {
  onOpen: () => void;
  disabled?: boolean;
  options?: {
    showDeleteCompany: boolean;
    addToFavoritesDisabled?: boolean;
    exportCompanyDisabled?: boolean;
    onDeleteCompany?: () => void;
    onAddToFavorites?: () => void;
    onExportCompany?: () => void;
  };
};

export function Footer(props: FooterProps) {
  const [isOptionsOpen, setIsOptionsOpen] = createSignal(false);
  const [isMac, setIsMac] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ left: 0, top: 0 });
  let optionsRootRef: HTMLDivElement | undefined;
  let optionsTriggerRef: HTMLButtonElement | undefined;
  let optionsMenuRef: HTMLDivElement | undefined;

  const modKeyLabel = createMemo(() => (isMac() ? "⌘" : "Ctrl"));
  const hasOptionsMenu = createMemo(() => props.options !== undefined);

  const closeOptionsMenu = () => {
    setIsOptionsOpen(false);
  };

  const openRecord = () => {
    if (props.disabled) return;
    props.onOpen();
  };

  const toggleOptionsMenu = () => {
    if (!hasOptionsMenu()) return;
    setIsOptionsOpen((current) => !current);
  };

  const updateOptionsMenuPosition = () => {
    const trigger = optionsTriggerRef;
    if (!trigger) return;

    const MENU_GUTTER = 8;
    const MENU_OFFSET = 8;
    const FALLBACK_MENU_WIDTH = 232;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = optionsMenuRef?.offsetWidth ?? FALLBACK_MENU_WIDTH;
    const menuHeight = optionsMenuRef?.offsetHeight ?? 0;
    const maxLeft = Math.max(
      MENU_GUTTER,
      window.innerWidth - menuWidth - MENU_GUTTER,
    );
    const left = Math.min(
      Math.max(rect.right - menuWidth, MENU_GUTTER),
      maxLeft,
    );
    const topAligned = rect.top - menuHeight - MENU_OFFSET;
    const top =
      topAligned < MENU_GUTTER ? rect.bottom + MENU_OFFSET : topAligned;

    setMenuPosition({ left, top });
  };

  useDismissibleLayer({
    enabled: isOptionsOpen,
    onDismiss: closeOptionsMenu,
    getContainer: () => optionsRootRef,
    getAdditionalContainers: () => [optionsMenuRef],
  });

  onMount(() => {
    setIsMac(/Mac/i.test(navigator.platform));
  });

  createEffect(() => {
    if (!isOptionsOpen()) return;

    updateOptionsMenuPosition();

    const rafA = window.requestAnimationFrame(() => {
      updateOptionsMenuPosition();
      window.requestAnimationFrame(updateOptionsMenuPosition);
    });

    const handleViewportChange = () => updateOptionsMenuPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    onCleanup(() => {
      window.cancelAnimationFrame(rafA);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    });
  });

  useScopedHotkey("Mod+O", () => toggleOptionsMenu(), {
    allowInInputs: true,
    enabled: hasOptionsMenu,
  });
  useScopedHotkey("Mod+Enter", () => openRecord(), { allowInInputs: true });

  return (
    <PanelFooter>
      <Show
        when={hasOptionsMenu()}
        fallback={
          <FooterButtonSecondary>
            <FooterLabel>Opciones</FooterLabel>
            <FooterDots />
            <FooterShortcut>{modKeyLabel()} O</FooterShortcut>
          </FooterButtonSecondary>
        }
      >
        <div class={styles.optionsRoot} ref={(el) => (optionsRootRef = el)}>
          <FooterButtonSecondary
            onClick={toggleOptionsMenu}
            aria-haspopup="menu"
            aria-expanded={isOptionsOpen()}
            class={styles.optionsTrigger}
            ref={(el) => (optionsTriggerRef = el)}
          >
            <FooterLabel>Opciones</FooterLabel>
            <FooterDots />
            <FooterShortcut>{modKeyLabel()} O</FooterShortcut>
          </FooterButtonSecondary>
        </div>
      </Show>
      <Show when={hasOptionsMenu() && isOptionsOpen()}>
        <Portal>
          <div
            class={styles.optionsMenu}
            role="menu"
            ref={(el) => (optionsMenuRef = el)}
            style={{
              left: `${menuPosition().left}px`,
              top: `${menuPosition().top}px`,
            }}
          >
            <button
              type="button"
              class={styles.optionsMenuItem}
              disabled={props.options?.addToFavoritesDisabled}
              onClick={() => {
                props.options?.onAddToFavorites?.();
                closeOptionsMenu();
              }}
            >
              <span class={styles.optionsMenuIcon}>
                <Heart size={14} />
              </span>
              <span>Agregar a favoritos</span>
            </button>
            <button
              type="button"
              class={styles.optionsMenuItem}
              disabled={props.options?.exportCompanyDisabled}
              onClick={() => {
                props.options?.onExportCompany?.();
                closeOptionsMenu();
              }}
            >
              <span class={styles.optionsMenuIcon}>
                <Export size={14} />
              </span>
              <span>Exportar empresa</span>
            </button>
            <button type="button" class={styles.optionsMenuItem} disabled>
              <span class={styles.optionsMenuIcon}>
                <Mail size={14} />
              </span>
              <span>Enviar correo (próximamente)</span>
            </button>
            <Show when={props.options?.showDeleteCompany}>
              <button
                type="button"
                class={`${styles.optionsMenuItem} ${styles.optionsMenuItemDanger}`}
                onClick={() => {
                  props.options?.onDeleteCompany?.();
                  closeOptionsMenu();
                }}
              >
                <span class={styles.optionsMenuIcon}>
                  <Trash size={14} />
                </span>
                <span>Eliminar empresa</span>
              </button>
            </Show>
          </div>
        </Portal>
      </Show>
      <FooterButtonPrimary onClick={openRecord} disabled={props.disabled}>
        <FooterIcon>
          <BrowserMaximize size={14} />
        </FooterIcon>
        <FooterLabel>Abrir</FooterLabel>
        <FooterShortcut>{modKeyLabel()} ⏎</FooterShortcut>
      </FooterButtonPrimary>
    </PanelFooter>
  );
}
