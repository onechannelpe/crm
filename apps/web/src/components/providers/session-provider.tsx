import { createAsync, revalidate } from "@solidjs/router";
import {
  createContext,
  createEffect,
  createSignal,
  on,
  type ParentProps,
  useContext,
} from "solid-js";

import type { CurrentUserView } from "~/contracts/auth";
import { meQuery } from "~/features/auth/data/queries/me";

interface SessionContextValue {
  user: () => CurrentUserView | null | undefined;
  updateCurrentUser: (
    update: (current: CurrentUserView) => CurrentUserView,
  ) => void;
  refreshCurrentUser: () => Promise<CurrentUserView | null | undefined>;
}

const SessionContext = createContext<SessionContextValue>();

export function SessionProvider(props: ParentProps) {
  const remote = createAsync(() => meQuery());
  const [overlay, setOverlay] = createSignal<CurrentUserView>();

  // Drop the optimistic overlay once authoritative session data arrives.
  createEffect(on(remote, () => setOverlay(undefined), { defer: true }));

  const user = () => overlay() ?? remote();

  const updateCurrentUser = (
    update: (current: CurrentUserView) => CurrentUserView,
  ) => {
    const current = overlay() ?? remote.latest;
    if (current) {
      setOverlay(update(current));
    }
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        updateCurrentUser,
        refreshCurrentUser: async () => {
          await revalidate(meQuery.key);
          return user();
        },
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
