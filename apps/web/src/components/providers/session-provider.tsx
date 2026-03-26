import { createContext, type ParentProps, useContext } from "solid-js";
import { createEffect, createResource } from "solid-js";

import type { CurrentUser } from "~/actions/auth";
import { getMe } from "~/actions/auth";
import { createDiagnostics } from "~/lib/observability/diagnostics";

interface SessionContextValue {
  user: () => CurrentUser | null | undefined;
  currentUser: () => CurrentUser;
  updateCurrentUser: (update: (current: CurrentUser) => CurrentUser) => void;
  refreshCurrentUser: () => Promise<CurrentUser | null | undefined>;
}

const SessionContext = createContext<SessionContextValue>();
const diagnostics = createDiagnostics("session-provider");

export function SessionProvider(props: ParentProps) {
  const [user, { mutate, refetch }] = createResource(getMe);

  createEffect(() => {
    const value = user();

    diagnostics.trace("ssr", "session_resource_state", {
      loading: user.loading,
      hasValue: value !== undefined,
      isNull: value === null,
      userId: value?.id ?? null,
    });
  });

  const currentUser = () => {
    const value = user();
    if (!value) {
      throw new Error("Authenticated app rendered without a valid user");
    }
    return value;
  };

  const updateCurrentUser = (update: (current: CurrentUser) => CurrentUser) => {
    mutate((existing) => (existing ? update(existing) : existing));
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        currentUser,
        updateCurrentUser,
        refreshCurrentUser: async () => refetch(),
      }}
    >
      {props.children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
