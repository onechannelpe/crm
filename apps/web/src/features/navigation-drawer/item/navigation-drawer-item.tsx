import { Show, type JSX } from "solid-js";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { NavigationDrawerActionItem } from "./navigation-drawer-action-item";
import { NavigationDrawerExternalItem } from "./navigation-drawer-external-item";
import type { NavigationDrawerItemProps } from "./navigation-drawer-item.types";
import { NavigationDrawerRouteItem } from "./navigation-drawer-route-item";

const DEFAULT_INDENTATION_LEVEL = 1;

export function NavigationDrawerItem(props: NavigationDrawerItemProps) {
  const { isMobile, setExpanded, expanded } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();

  const indentationLevel = () =>
    props.indentationLevel ?? DEFAULT_INDENTATION_LEVEL;
  const isSoon = () => props.modifier === "soon";
  const isExternalLink = () =>
    Boolean(
      props.to?.startsWith("http://") || props.to?.startsWith("https://"),
    );
  const internalHref = () =>
    props.to && !isExternalLink() ? props.to : undefined;
  const externalHref = () => (isExternalLink() ? props.to : undefined);
  const collapsedMain = () => !expanded() && !isSettingsPage();

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
  const frameProps = () => ({
    className: props.className,
    label: props.label,
    secondaryLabel: props.secondaryLabel,
    indentationLevel: indentationLevel(),
    subItemState: props.subItemState,
    Icon: props.Icon,
    active: props.active,
    modifier: props.modifier,
    rightOptions: props.rightOptions,
    alwaysShowRightOptions: props.alwaysShowRightOptions,
    showChevron: props.showChevron,
    chevronExpanded: props.chevronExpanded,
    variant: props.variant,
    collapsedMain: collapsedMain(),
    isMobile: isMobile(),
  });

  return (
    <Show
      when={internalHref()}
      keyed
      fallback={
        <Show
          when={externalHref()}
          keyed
          fallback={
            <NavigationDrawerActionItem
              frameProps={frameProps()}
              unavailable={isUnavailable()}
              onClick={handleButtonClick}
            />
          }
        >
          {(href) => (
            <NavigationDrawerExternalItem
              href={href}
              frameProps={frameProps()}
              unavailable={isUnavailable()}
              onClick={handleLinkClick}
            />
          )}
        </Show>
      }
    >
      {(href) => (
        <NavigationDrawerRouteItem
          href={href}
          frameProps={frameProps()}
          unavailable={isUnavailable()}
          onClick={handleLinkClick}
        />
      )}
    </Show>
  );
}
