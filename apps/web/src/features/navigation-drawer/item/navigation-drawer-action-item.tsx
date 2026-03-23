import type { JSX } from "solid-js";

import { NavigationDrawerItemFrame } from "./navigation-drawer-item-frame";

interface NavigationDrawerActionItemProps {
  frameProps: Omit<Parameters<typeof NavigationDrawerItemFrame>[0], "render">;
  unavailable: boolean;
  onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
}

export function NavigationDrawerActionItem(
  props: NavigationDrawerActionItemProps,
) {
  return (
    <NavigationDrawerItemFrame
      {...props.frameProps}
      render={(frame) => (
        <button
          type="button"
          class={frame.className}
          onClick={props.onClick}
          disabled={props.unavailable}
          aria-expanded={
            props.frameProps.showChevron
              ? props.frameProps.chevronExpanded
              : undefined
          }
          title={frame.title}
          style={frame.style}
        >
          {frame.content}
        </button>
      )}
    />
  );
}
