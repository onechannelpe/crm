import { A } from "@solidjs/router";
import type { JSX } from "solid-js";

import { NavigationDrawerItemFrame } from "./navigation-drawer-item-frame";

interface NavigationDrawerRouteItemProps {
  href: string;
  frameProps: Omit<Parameters<typeof NavigationDrawerItemFrame>[0], "render">;
  unavailable: boolean;
  onClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent>;
}

export function NavigationDrawerRouteItem(
  props: NavigationDrawerRouteItemProps,
) {
  return (
    <NavigationDrawerItemFrame
      {...props.frameProps}
      render={(frame) => (
        <A
          href={props.href}
          class={frame.className}
          onClick={props.onClick}
          draggable={false}
          aria-disabled={props.unavailable ? "true" : undefined}
          aria-current={props.frameProps.active ? "page" : undefined}
          tabindex={props.unavailable ? "-1" : undefined}
          title={frame.title}
          style={frame.style}
        >
          {frame.content}
        </A>
      )}
    />
  );
}
