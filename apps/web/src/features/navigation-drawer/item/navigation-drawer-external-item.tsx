import type { JSX } from "solid-js";

import { NavigationDrawerItemFrame } from "./navigation-drawer-item-frame";

interface NavigationDrawerExternalItemProps {
  href: string;
  frameProps: Omit<Parameters<typeof NavigationDrawerItemFrame>[0], "render">;
  unavailable: boolean;
  onClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent>;
}

export function NavigationDrawerExternalItem(
  props: NavigationDrawerExternalItemProps,
) {
  return (
    <NavigationDrawerItemFrame
      {...props.frameProps}
      render={(frame) => (
        <a
          href={props.href}
          class={frame.className}
          onClick={props.onClick}
          draggable={false}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={props.unavailable ? "true" : undefined}
          tabindex={props.unavailable ? "-1" : undefined}
          title={frame.title}
          style={frame.style}
        >
          {frame.content}
        </a>
      )}
    />
  );
}
