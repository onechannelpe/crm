import { useLocation } from "@solidjs/router";

import { isSettingsRoutePath } from "~/domain/navigation/route-classification";

export function useIsSettingsPage() {
  const location = useLocation();

  return () => isSettingsRoutePath(location.pathname);
}
