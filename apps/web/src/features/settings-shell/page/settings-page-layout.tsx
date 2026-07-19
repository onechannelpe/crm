import { useLocation } from "@solidjs/router";
import { createMemo, type JSX, type ParentProps } from "solid-js";

import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import {
  getCurrentSettingsItem,
  getSettingsSectionHref,
  getSettingsSectionLabel,
} from "~/features/navigation-drawer/settings/settings-navigation.selectors";
import { SettingsPageContainer } from "~/features/settings-shell/content/settings-page-container";

import type { BreadcrumbItem, MobileBackAction } from "./breadcrumb-model";
import { SubMenuTopBarContainer } from "./sub-menu-top-bar-container";

interface SettingsPageLayoutProps extends ParentProps {
  actionButton?: JSX.Element;
}

// Each page owns its top bar so it can provide page-level actions.
export function SettingsPageLayout(props: SettingsPageLayoutProps) {
  const location = useLocation();
  const { currentUser } = useAuthenticatedSession();

  const currentItem = createMemo(() =>
    getCurrentSettingsItem(location.pathname, currentUser().role),
  );

  const sectionHref = createMemo(() =>
    getSettingsSectionHref(currentItem().section, currentUser().role),
  );

  const breadcrumbItems = createMemo<BreadcrumbItem[]>(() => [
    {
      label: getSettingsSectionLabel(currentItem().section, currentUser().role),
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
      actionButton={props.actionButton}
    >
      <SettingsPageContainer>{props.children}</SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
}
