import { useLocation } from "@solidjs/router";
import { Show } from "solid-js";

import { AdvancedSettingsWrapper } from "../advanced/advanced-settings-wrapper";
import { NavigationDrawerItem } from "../item/navigation-drawer-item";
import type { NavigationDrawerSubItemState } from "../item/navigation-drawer-item.types";
import { settingsItemMatchesPath } from "./settings-navigation-path-match";
import type { SettingsNavItem } from "./settings-navigation.types";

interface SettingsNavigationDrawerItemProps {
  item: SettingsNavItem;
  subItemState?: NavigationDrawerSubItemState;
  hasActiveSubItem?: boolean;
  closeOnNavigate?: () => void;
  onAction?: (item: SettingsNavItem) => void | Promise<void>;
}

export function SettingsNavigationDrawerItem(
  props: SettingsNavigationDrawerItemProps,
) {
  const location = useLocation();
  const active =
    settingsItemMatchesPath(
      location.pathname,
      props.item.href,
      props.item.matchSubPages,
    ) && !props.hasActiveSubItem;

  const content = (
    <NavigationDrawerItem
      label={props.item.label}
      to={props.item.href}
      Icon={props.item.icon}
      active={active}
      modifier={props.item.modifier}
      onClick={() => {
        void props.onAction?.(props.item);
      }}
      closeOnNavigate={props.closeOnNavigate}
      indentationLevel={props.item.indentationLevel}
      subItemState={props.subItemState}
    />
  );

  return (
    <Show when={props.item.advanced} fallback={content}>
      <AdvancedSettingsWrapper>{content}</AdvancedSettingsWrapper>
    </Show>
  );
}
