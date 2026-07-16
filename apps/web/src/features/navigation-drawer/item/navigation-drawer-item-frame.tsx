import type { Accessor, JSX } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { TintedIconTile } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";
import { cn } from "~/lib/utils";

import { NavigationDrawerAnimatedCollapseWrapper } from "./navigation-drawer-animated-collapse-wrapper";
import { NavigationDrawerItemBreadcrumb } from "./navigation-drawer-item-breadcrumb";
import type { NavigationDrawerItemFrameBaseProps } from "./navigation-drawer-item.types";

import styles from "./navigation-drawer-item.module.css";

export interface NavigationDrawerItemFrameRenderProps {
  class: Accessor<string>;
  content: JSX.Element;
  style: Accessor<JSX.CSSProperties>;
  title: Accessor<string | undefined>;
}

export interface NavigationDrawerItemFrameProps extends NavigationDrawerItemFrameBaseProps {
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

  const classProp = () =>
    cn(
      "navigation-drawer-item",
      styles.item,
      props.class,
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
          {props.tileColor ? (
            <TintedIconTile Icon={props.Icon} color={props.tileColor} />
          ) : (
            <props.Icon size={16} />
          )}
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
          <span class={styles.itemPill}>Próximamente</span>
        </NavigationDrawerAnimatedCollapseWrapper>
      ) : null}

      {isNew() ? (
        <NavigationDrawerAnimatedCollapseWrapper>
          <span class={styles.itemPill}>Nuevo</span>
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

  const style = () =>
    ({
      "--item-width-base": props.collapsedMain ? "40px" : "100%",
      "--item-padding-right": hasRightOptions() ? "2px" : "4px",
      cursor: isSoon() ? "default" : "pointer",
      "pointer-events": isSoon() ? "none" : "auto",
    }) satisfies JSX.CSSProperties;
  const title = () => (props.collapsedMain ? props.label : undefined);

  return props.render({
    class: classProp,
    content,
    style,
    title,
  });
}
