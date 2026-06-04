import type { JSX } from "solid-js";

import {
  NavigationDrawerItemFrame,
  type NavigationDrawerItemFrameProps,
} from "./navigation-drawer-item-frame";

interface NavigationDrawerActionItemProps extends Omit<
  NavigationDrawerItemFrameProps,
  "render"
> {
  unavailable: boolean;
  onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
}

export function NavigationDrawerActionItem(
  props: NavigationDrawerActionItemProps,
) {
  return (
    <NavigationDrawerItemFrame
      class={props.class}
      label={props.label}
      secondaryLabel={props.secondaryLabel}
      indentationLevel={props.indentationLevel}
      subItemState={props.subItemState}
      Icon={props.Icon}
      tileColor={props.tileColor}
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
        <button
          type="button"
          class={frame.class()}
          onClick={props.onClick}
          disabled={props.unavailable}
          aria-expanded={props.showChevron ? props.chevronExpanded : undefined}
          title={frame.title()}
          style={frame.style()}
        >
          {frame.content}
        </button>
      )}
    />
  );
}
