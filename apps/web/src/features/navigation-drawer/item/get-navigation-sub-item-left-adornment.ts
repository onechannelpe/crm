import type { NavigationDrawerSubItemState } from "./navigation-drawer-item";

export function getNavigationSubItemLeftAdornment({
  index,
  arrayLength,
  selectedIndex,
}: {
  index: number;
  arrayLength: number;
  selectedIndex: number;
}): NavigationDrawerSubItemState {
  const thereIsOnlyOneItem = arrayLength === 1;
  const itsTheLastItem = index === arrayLength - 1;
  const itsTheSelectedItem = index === selectedIndex;
  const itsBeforeTheSelectedItem = index < selectedIndex;

  if (thereIsOnlyOneItem || itsTheLastItem) {
    if (itsTheSelectedItem) {
      return "last-selected";
    }

    return "last-not-selected";
  }

  if (itsTheSelectedItem) {
    return "intermediate-selected";
  }

  if (itsBeforeTheSelectedItem) {
    return "intermediate-before-selected";
  }

  return "intermediate-after-selected";
}
