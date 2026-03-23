import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { createMemo } from "solid-js";

import {
  getCurrentSettingsItem,
  getSettingsSectionHref,
  getSettingsSectionLabel,
} from "~/features/navigation-drawer";
import {
  type BreadcrumbItem,
  type MobileBackAction,
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
  const breadcrumbItems = createMemo<BreadcrumbItem[]>(() => [
    {
      label: sectionLabel(),
      href: sectionHref(),
    },
    {
      label: currentItem().label,
    },
  ]);
  const mobileBackAction = createMemo<MobileBackAction>(() => {
    if (!sectionHref()) {
      return { kind: "none" };
    }

    return {
      kind: "open-settings-drawer",
      label: "Volver a ajustes",
    };
  });

  return (
    <SubMenuTopBarContainer
      breadcrumbItems={breadcrumbItems()}
      mobileBackAction={mobileBackAction()}
      title={currentItem().label}
    >
      <SettingsPageContainer>{props.children}</SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
}
