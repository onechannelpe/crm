import type { JSX } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { cn } from "~/lib/utils";

import { NavigationDrawerAnimatedCollapseWrapper } from "./navigation-drawer-animated-collapse-wrapper";
import { NavigationDrawerItemBreadcrumb } from "./navigation-drawer-item-breadcrumb";
import type {
  NavigationDrawerIcon,
  NavigationDrawerItemModifier,
  NavigationDrawerItemVariant,
  NavigationDrawerSubItemState,
} from "./navigation-drawer-item.types";

import styles from "./navigation-drawer-item.module.css";

export interface NavigationDrawerItemFrameRenderProps {
  className: string;
  content: JSX.Element;
  style: JSX.CSSProperties;
  title?: string;
}

interface NavigationDrawerItemFrameProps {
  className?: string;
  label: string;
  secondaryLabel?: string;
  indentationLevel: 1 | 2;
  subItemState?: NavigationDrawerSubItemState;
  Icon?: NavigationDrawerIcon;
  active?: boolean;
  modifier?: NavigationDrawerItemModifier;
  rightOptions?: JSX.Element;
  alwaysShowRightOptions?: boolean;
  showChevron?: boolean;
  chevronExpanded?: boolean;
  variant?: NavigationDrawerItemVariant;
  collapsedMain: boolean;
  isMobile: boolean;
  render: (props: NavigationDrawerItemFrameRenderProps) => JSX.Element;
}

export function NavigationDrawerItemFrame(
  props: NavigationDrawerItemFrameProps,
) {
  const isSoon = () => props.modifier === "soon";
  const isNew = () => props.modifier === "new";
  const showBreadcrumb = () => props.indentationLevel === 2;
  const hasRightOptions = () =>
    Boolean(props.rightOptions) || Boolean(props.showChevron);
  const shouldShowRightOptions = () =>
    props.isMobile || Boolean(props.alwaysShowRightOptions);

  const className = () =>
    cn(
      "navigation-drawer-item",
      styles.item,
      props.className,
      props.active && styles.itemActive,
      props.indentationLevel === 2 && styles.itemIndented,
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
          props.collapsedMain && styles.itemLabelCollapsed,
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

  return props.render({
    className: className(),
    content,
    style: {
      "--item-width-base": props.collapsedMain ? "40px" : "100%",
      "--item-padding-right": hasRightOptions() ? "2px" : "4px",
      cursor: isSoon() ? "default" : "pointer",
      "pointer-events": isSoon() ? "none" : "auto",
    },
    title: props.collapsedMain ? props.label : undefined,
  });
}
