import { createContext, type ParentProps, useContext } from "solid-js";
import { createResource } from "solid-js";

import type { CurrentUser } from "~/actions/auth/session";
import { getMe } from "~/actions/auth/session";

interface SessionContextValue {
  user: () => CurrentUser | null | undefined;
  updateCurrentUser: (update: (current: CurrentUser) => CurrentUser) => void;
  refreshCurrentUser: () => Promise<CurrentUser | null | undefined>;
}

const SessionContext = createContext<SessionContextValue>();

export function SessionProvider(props: ParentProps) {
  const [user, { mutate, refetch }] = createResource(getMe);

  const updateCurrentUser = (update: (current: CurrentUser) => CurrentUser) => {
    mutate((existing: CurrentUser | null | undefined) =>
      existing ? update(existing) : existing,
    );
  };

  return (
    <SessionContext.Provider
      value={{
        user,
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
