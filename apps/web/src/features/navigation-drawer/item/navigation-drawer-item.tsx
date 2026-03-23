import { A } from "@solidjs/router";
import { Show, type JSX } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { cn } from "~/lib/utils";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { NavigationDrawerAnimatedCollapseWrapper } from "./navigation-drawer-animated-collapse-wrapper";
import { NavigationDrawerItemBreadcrumb } from "./navigation-drawer-item-breadcrumb";

import styles from "../navigation-drawer.module.css";

export type NavigationDrawerSubItemState =
  | "intermediate-before-selected"
  | "intermediate-selected"
  | "intermediate-after-selected"
  | "last-selected"
  | "last-not-selected";

export type NavigationDrawerItemModifier = "new" | "soon";

export interface NavigationDrawerItemProps {
  className?: string;
  label: string;
  secondaryLabel?: string;
  indentationLevel?: 1 | 2;
  subItemState?: NavigationDrawerSubItemState;
  to?: string;
  onClick?: () => void;
  Icon?: (props: {
    class?: string;
    size?: number;
    strokeWidth?: number;
  }) => JSX.Element;
  active?: boolean;
  modifier?: NavigationDrawerItemModifier;
  rightOptions?: JSX.Element;
  alwaysShowRightOptions?: boolean;
  closeOnNavigate?: () => void;
  showChevron?: boolean;
  chevronExpanded?: boolean;
  preventCollapseOnMobile?: boolean;
  variant?: "default" | "tertiary";
}

const DEFAULT_INDENTATION_LEVEL = 1;

export function NavigationDrawerItem(props: NavigationDrawerItemProps) {
  const { isMobile, setExpanded, expanded } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();

  const indentationLevel = () =>
    props.indentationLevel ?? DEFAULT_INDENTATION_LEVEL;
  const isSoon = () => props.modifier === "soon";
  const isNew = () => props.modifier === "new";
  const showBreadcrumb = () => indentationLevel() === 2;
  const isExternalLink = () =>
    Boolean(
      props.to?.startsWith("http://") || props.to?.startsWith("https://"),
    );
  const internalHref = () =>
    props.to && !isExternalLink() ? props.to : undefined;
  const externalHref = () => (isExternalLink() ? props.to : undefined);
  const collapsedMain = () => !expanded() && !isSettingsPage();
  const hasRightOptions = () =>
    Boolean(props.rightOptions) || Boolean(props.showChevron);
  const shouldShowRightOptions = () =>
    isMobile() || Boolean(props.alwaysShowRightOptions);

  const handleMobileNavigation = () => {
    if (isMobile() && !props.preventCollapseOnMobile) {
      setExpanded(false);
    }
  };

  const handleItemAction = () => {
    if (isSoon()) {
      return;
    }

    handleMobileNavigation();
    props.onClick?.();
    props.closeOnNavigate?.();
  };
  const handleButtonClick = () => {
    handleItemAction();
  };
  const itemTitle = () => (collapsedMain() ? props.label : undefined);
  const itemStyle = (): JSX.CSSProperties => ({
    "--item-width-base": collapsedMain() ? "40px" : "100%",
    "--item-padding-right": hasRightOptions() ? "2px" : "4px",
    cursor: isSoon() ? "default" : "pointer",
    "pointer-events": isSoon() ? "none" : "auto",
  });
  const isUnavailable = () => isSoon();
  const handleLinkClick: JSX.EventHandlerUnion<
    HTMLAnchorElement,
    MouseEvent
  > = (event) => {
    if (isUnavailable()) {
      event.preventDefault();
      return;
    }

    handleItemAction();
  };

  const className = () =>
    cn(
      "navigation-drawer-item",
      styles.item,
      props.className,
      props.active && styles.itemActive,
      indentationLevel() === 2 && styles.itemIndented,
      props.variant === "tertiary" && styles.itemTertiary,
    );

  const content = (
    <div class={styles.itemElements}>
      {showBreadcrumb() ? (
        <NavigationDrawerAnimatedCollapseWrapper>
          <NavigationDrawerItemBreadcrumb state={props.subItemState} />
        </NavigationDrawerAnimatedCollapseWrapper>
      ) : null}

      {props.Icon ? (
        <span class={styles.iconWrap}>
          <props.Icon size={16} />
        </span>
      ) : null}

      <span
        class={cn(
          styles.itemLabel,
          collapsedMain() && styles.itemLabelCollapsed,
        )}
      >
        {props.label}
        {props.secondaryLabel ? ` · ${props.secondaryLabel}` : ""}
      </span>

      {isSoon() ? (
        <NavigationDrawerAnimatedCollapseWrapper>
          <span class={styles.itemPill}>Soon</span>
        </NavigationDrawerAnimatedCollapseWrapper>
      ) : null}

      {isNew() ? (
        <NavigationDrawerAnimatedCollapseWrapper>
          <span class={styles.itemPill}>New</span>
        </NavigationDrawerAnimatedCollapseWrapper>
      ) : null}

      {hasRightOptions() ? (
        <NavigationDrawerAnimatedCollapseWrapper>
          <span class={styles.itemRight}>
            <span
              class={styles.itemRightVisibility}
              data-visible={shouldShowRightOptions() ? "true" : undefined}
            >
              {props.showChevron ? (
                <span class={styles.itemChevron}>
                  <ChevronRight
                    size={12}
                    style={{
                      transform: props.chevronExpanded
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </span>
              ) : (
                (props.rightOptions ?? null)
              )}
            </span>
          </span>
        </NavigationDrawerAnimatedCollapseWrapper>
      ) : null}
    </div>
  );

  return (
    <Show
      when={internalHref()}
      keyed
      fallback={
        <Show
          when={externalHref()}
          keyed
          fallback={
            <button
              type="button"
              class={className()}
              onClick={handleButtonClick}
              disabled={isUnavailable()}
              aria-expanded={
                props.showChevron ? props.chevronExpanded : undefined
              }
              title={itemTitle()}
              style={itemStyle()}
            >
              {content}
            </button>
          }
        >
          {(href) => (
            <a
              href={href}
              class={className()}
              onClick={handleLinkClick}
              draggable={false}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={isUnavailable() ? "true" : undefined}
              tabindex={isUnavailable() ? "-1" : undefined}
              title={itemTitle()}
              style={itemStyle()}
            >
              {content}
            </a>
          )}
        </Show>
      }
    >
      {(href) => (
        <A
          href={href}
          class={className()}
          onClick={handleLinkClick}
          draggable={false}
          aria-disabled={isUnavailable() ? "true" : undefined}
          aria-current={props.active ? "page" : undefined}
          tabindex={isUnavailable() ? "-1" : undefined}
          title={itemTitle()}
          style={itemStyle()}
        >
          {content}
        </A>
      )}
    </Show>
  );
}
