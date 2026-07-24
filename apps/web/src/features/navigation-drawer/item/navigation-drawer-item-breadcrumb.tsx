import type { NavigationDrawerSubItemState } from "./navigation-drawer-item.types";

import styles from "./navigation-drawer-item.module.css";

export function NavigationDrawerItemBreadcrumb(props: {
  state?: NavigationDrawerSubItemState;
}) {
  const showVerticalBar = () =>
    props.state !== "last-not-selected" && props.state !== "last-selected";

  const verticalBarShouldBeDarker = () =>
    props.state === "intermediate-before-selected";

  const protrusionShouldBeDarker = () =>
    props.state === "intermediate-selected" || props.state === "last-selected";

  const gapShouldBeDarker = () =>
    props.state === "intermediate-before-selected" ||
    props.state === "intermediate-selected" ||
    props.state === "last-selected";

  return (
    <span class={styles.subItemBreadcrumb}>
      <span
        class={styles.subItemBreadcrumbGap}
        data-darker={gapShouldBeDarker() ? "true" : undefined}
      />
      <span
        class={styles.subItemBreadcrumbElbow}
        data-darker={protrusionShouldBeDarker() ? "true" : undefined}
      />
      {showVerticalBar() ? (
        <span
          class={styles.subItemBreadcrumbVertical}
          data-darker={verticalBarShouldBeDarker() ? "true" : undefined}
        />
      ) : null}
    </span>
  );
}
