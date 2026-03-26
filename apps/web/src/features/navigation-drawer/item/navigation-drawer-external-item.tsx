import type { JSX } from "solid-js";

import {
  NavigationDrawerItemFrame,
  type NavigationDrawerItemFrameProps,
} from "./navigation-drawer-item-frame";

interface NavigationDrawerExternalItemProps extends Omit<
  NavigationDrawerItemFrameProps,
  "render"
> {
  href: string;
  unavailable: boolean;
  onClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent>;
}

export function NavigationDrawerExternalItem(
  props: NavigationDrawerExternalItemProps,
) {
  return (
    <NavigationDrawerItemFrame
      className={props.className}
      label={props.label}
      secondaryLabel={props.secondaryLabel}
      indentationLevel={props.indentationLevel}
      subItemState={props.subItemState}
      Icon={props.Icon}
      active={props.active}
      modifier={props.modifier}
      rightOptions={props.rightOptions}
      alwaysShowRightOptions={props.alwaysShowRightOptions}
      showChevron={props.showChevron}
      chevronExpanded={props.chevronExpanded}
      variant={props.variant}
      collapsedMain={props.collapsedMain}
      isMobile={props.isMobile}
      render={(frame) => (
        <a
          href={props.href}
          class={frame.className()}
          onClick={props.onClick}
          draggable={false}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={props.unavailable ? "true" : undefined}
          tabindex={props.unavailable ? "-1" : undefined}
          title={frame.title()}
          style={frame.style()}
        >
          {frame.content}
        </a>
      )}
    />
  );
}
