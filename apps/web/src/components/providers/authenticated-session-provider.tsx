import { Navigate } from "@solidjs/router";
import type { ParentProps } from "solid-js";
import { Match, Switch, createContext, useContext } from "solid-js";

import type { CurrentUserView } from "~/actions/auth/session";
import { Loading } from "~/components/feedback/loading";

import { SessionProvider, useSession } from "./session-provider";

interface AuthenticatedSessionContextValue {
  currentUser: () => CurrentUserView;
  updateCurrentUser: (
    update: (current: CurrentUserView) => CurrentUserView,
  ) => void;
  refreshCurrentUser: () => Promise<CurrentUserView | null | undefined>;
}

const AuthenticatedSessionContext =
  createContext<AuthenticatedSessionContextValue>();

function AuthenticatedSessionBoundary(props: ParentProps) {
  const { user, updateCurrentUser, refreshCurrentUser } = useSession();

  const currentUser = () => {
    const value = user();
    if (!value) {
      throw new Error("Authenticated app rendered without a valid user");
    }
    return value;
  };

  return (
    <Switch>
      <Match when={user() === undefined}>
        <Loading />
      </Match>
      <Match when={user() === null}>
        <Navigate href="/login" />
      </Match>
      <Match when={Boolean(user())}>
        <AuthenticatedSessionContext.Provider
          value={{
            currentUser,
            updateCurrentUser,
            refreshCurrentUser,
          }}
        >
          {props.children}
        </AuthenticatedSessionContext.Provider>
      </Match>
    </Switch>
  );
}

export function AuthenticatedSessionProvider(props: ParentProps) {
  return (
    <SessionProvider>
      <AuthenticatedSessionBoundary>
        {props.children}
      </AuthenticatedSessionBoundary>
    </SessionProvider>
  );
}

export function useAuthenticatedSession() {
  const context = useContext(AuthenticatedSessionContext);
  if (!context) {
    throw new Error(
      "useAuthenticatedSession must be used within AuthenticatedSessionProvider",
    );
  }
  return context;
}
