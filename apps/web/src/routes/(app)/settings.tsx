import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { createMemo } from "solid-js";

import {
  getCurrentSettingsItem,
  getSettingsSectionHref,
  getSettingsSectionLabel,
} from "~/features/navigation-drawer";
import {
  type BreadcrumbLink,
  SettingsPageContainer,
  SubMenuTopBarContainer,
} from "~/features/settings-shell";

export default function SettingsLayout(props: RouteSectionProps) {
  const location = useLocation();

  const currentItem = createMemo(() =>
    getCurrentSettingsItem(location.pathname),
  );
  const sectionLabel = createMemo(() =>
    getSettingsSectionLabel(currentItem().section),
  );
  const sectionHref = createMemo(() =>
    getSettingsSectionHref(currentItem().section),
  );
  const links = createMemo<BreadcrumbLink[]>(() => [
    {
      children: sectionLabel(),
      href: sectionHref(),
    },
    {
      children: currentItem().label,
    },
  ]);

  return (
    <SubMenuTopBarContainer links={links()} title={currentItem().label}>
      <SettingsPageContainer>{props.children}</SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
}
