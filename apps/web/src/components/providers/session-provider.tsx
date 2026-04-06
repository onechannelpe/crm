import { createContext, type ParentProps, useContext } from "solid-js";
import { createResource } from "solid-js";

import { getMe } from "~/actions/auth/session";
import type { CurrentUserView } from "~/server/auth/application/views/current-user-view";

interface SessionContextValue {
  user: () => CurrentUserView | null | undefined;
  updateCurrentUser: (
    update: (current: CurrentUserView) => CurrentUserView,
  ) => void;
  refreshCurrentUser: () => Promise<CurrentUserView | null | undefined>;
}

const SessionContext = createContext<SessionContextValue>();

export function SessionProvider(props: ParentProps) {
  const [user, { mutate, refetch }] = createResource(getMe);

  const updateCurrentUser = (
    update: (current: CurrentUserView) => CurrentUserView,
  ) => {
    mutate((existing: CurrentUserView | null | undefined) =>
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
