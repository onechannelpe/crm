import { A, useLocation } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
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
  childGroupOpen?: boolean;
  onToggleChildGroup?: () => void;
  closeOnNavigate?: () => void;
}

type SubItemAdornmentState =
  | "intermediate-before-selected"
  | "intermediate-selected"
  | "intermediate-after-selected"
  | "last-selected"
  | "last-not-selected";

function getSubItemAdornmentState({
  index,
  arrayLength,
  selectedIndex,
}: {
  index: number;
  arrayLength: number;
  selectedIndex: number;
}): SubItemAdornmentState {
  const thereIsOnlyOneItem = arrayLength === 1;
  const isLast = index === arrayLength - 1;
  const isSelected = index === selectedIndex;
  const isBeforeSelected = index < selectedIndex;

  if (thereIsOnlyOneItem || isLast) {
    return isSelected ? "last-selected" : "last-not-selected";
  }

  if (isSelected) {
    return "intermediate-selected";
  }

  if (isBeforeSelected) {
    return "intermediate-before-selected";
  }

  return "intermediate-after-selected";
}

function SubItemBreadcrumb(props: { state: SubItemAdornmentState }) {
  const showVerticalBar =
    props.state !== "last-not-selected" && props.state !== "last-selected";
  const verticalBarDarker = props.state === "intermediate-before-selected";
  const protrusionDarker =
    props.state === "intermediate-selected" || props.state === "last-selected";
  const gapDarker =
    props.state === "intermediate-before-selected" ||
    props.state === "intermediate-selected" ||
    props.state === "last-selected";

  return (
    <span class={styles.subItemBreadcrumb}>
      <span
        class={styles.subItemBreadcrumbGap}
        data-darker={gapDarker ? "true" : "false"}
      />
      <span
        class={styles.subItemBreadcrumbElbow}
        data-darker={protrusionDarker ? "true" : "false"}
      />
      <Show when={showVerticalBar}>
        <span
          class={styles.subItemBreadcrumbVertical}
          data-darker={verticalBarDarker ? "true" : "false"}
        />
      </Show>
    </span>
  );
}

export function NavigationDrawerItem(props: NavigationDrawerItemProps) {
  const location = useLocation();
  const Icon = getEntryIcon(props.item.icon);
  const hasChildren = props.item.children.length > 0;
  const selectedChildIndex = props.item.children.findIndex((child) =>
    isChildActive(location.pathname, child.href),
  );

  return (
    <div
      class={cn(
        styles.itemGroup,
        hasChildren && !props.expanded && styles.itemGroupCollapsed,
      )}
    >
      <Show
        when={hasChildren}
        fallback={
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
              class={cn(
                styles.itemLabel,
                !props.expanded && styles.itemLabelCollapsed,
              )}
            >
              {props.item.label}
            </span>
          </A>
        }
      >
        <button
          type="button"
          onClick={props.onToggleChildGroup}
          class={cn(
            styles.item,
            styles.itemButton,
            !props.expanded && styles.itemCollapsed,
            selectedChildIndex >= 0 && styles.itemActive,
          )}
          aria-expanded={Boolean(props.childGroupOpen)}
        >
          <Icon size={16} />
          <span
            class={cn(
              styles.itemLabel,
              !props.expanded && styles.itemLabelCollapsed,
            )}
          >
            {props.item.label}
          </span>
          <Show when={props.expanded}>
            <span
              class={styles.itemChevron}
              style={{
                transform: props.childGroupOpen
                  ? "rotate(0deg)"
                  : "rotate(-90deg)",
              }}
            >
              <ChevronDown size={12} />
            </span>
          </Show>
        </button>
      </Show>

      <Show when={hasChildren}>
        <AnimatedExpandableContainer
          isExpanded={
            props.sectionOpen && props.expanded && Boolean(props.childGroupOpen)
          }
          duration={300}
        >
          <div class={styles.subgroup}>
            <For each={props.item.children}>
              {(child, index) => (
                <A
                  href={child.href}
                  onClick={() => props.closeOnNavigate?.()}
                  class={cn(
                    styles.item,
                    styles.subItem,
                    isChildActive(location.pathname, child.href) &&
                      styles.itemActive,
                  )}
                >
                  <SubItemBreadcrumb
                    state={getSubItemAdornmentState({
                      index: index(),
                      arrayLength: props.item.children.length,
                      selectedIndex: selectedChildIndex,
                    })}
                  />
                  <span>{child.label}</span>
                </A>
              )}
            </For>
          </div>
        </AnimatedExpandableContainer>
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
        class={cn(
          styles.sectionTitle,
          !props.expanded && styles.sectionTitleCollapsed,
        )}
        aria-expanded={props.open}
      >
        <span class={styles.sectionTitleLabel}>{props.label}</span>
        <span
          class={cn(
            styles.sectionTitleChevron,
            styles.sectionTitleChevronVisible,
          )}
          style={{ transform: props.open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <ChevronDown size={12} />
        </span>
      </button>

      <AnimatedExpandableContainer isExpanded={props.open} duration={300}>
        <div class={styles.collapseWrapper}>{props.children}</div>
      </AnimatedExpandableContainer>
    </section>
  );
}
