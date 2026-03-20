import { A, useLocation } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { cn } from "~/lib/utils";

import {
  getEntryIcon,
  isChildActive,
  isEntryActive,
  type DrawerNavEntry,
} from "./navigation-drawer-adapter";
import styles from "./navigation-drawer.module.css";

interface NavigationDrawerItemProps {
  item: DrawerNavEntry;
  expanded: boolean;
  sectionOpen: boolean;
  closeOnNavigate?: () => void;
}

export function NavigationDrawerItem(props: NavigationDrawerItemProps) {
  const location = useLocation();
  const Icon = getEntryIcon(props.item.icon);

  return (
    <div
      class={cn(
        styles.itemGroup,
        props.item.children.length > 0 &&
          !props.expanded &&
          styles.itemGroupCollapsed,
      )}
    >
      <A
        href={props.item.href}
        onClick={() => props.closeOnNavigate?.()}
        class={cn(
          styles.item,
          !props.expanded && styles.itemCollapsed,
          isEntryActive(location.pathname, props.item) && styles.itemActive,
        )}
      >
        <Icon size={16} />
        <span
          class={cn(styles.itemLabel, !props.expanded && styles.itemLabelCollapsed)}
        >
          {props.item.label}
        </span>
      </A>

      <Show when={props.item.children.length > 0}>
        <div
          class={cn(
            styles.subgroup,
            (!props.sectionOpen || !props.expanded) && styles.subgroupClosed,
          )}
        >
          <For each={props.item.children}>
            {(child) => (
              <A
                href={child.href}
                onClick={() => props.closeOnNavigate?.()}
                class={cn(
                  styles.item,
                  styles.subItem,
                  isChildActive(location.pathname, child.href) && styles.itemActive,
                )}
              >
                <span class={styles.dot} />
                <span>{child.label}</span>
              </A>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

interface DrawerSectionProps {
  label: string;
  expanded: boolean;
  open: boolean;
  onToggle: () => void;
  children: JSX.Element;
}

export function DrawerSection(props: DrawerSectionProps) {
  return (
    <section class={styles.section}>
      <button
        type="button"
        onClick={props.onToggle}
        class={cn(styles.sectionTitle, !props.expanded && styles.sectionTitleCollapsed)}
        aria-expanded={props.open}
      >
        <span class={styles.sectionTitleLabel}>{props.label}</span>
        <span
          class={cn(styles.sectionTitleChevron, styles.sectionTitleChevronVisible)}
          style={{ transform: props.open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <ChevronDown size={12} />
        </span>
      </button>

      <div
        class={cn(
          styles.collapseWrapper,
          props.open ? styles.collapseOpen : styles.collapseClosed,
        )}
      >
        {props.children}
      </div>
    </section>
  );
}
