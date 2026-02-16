import { createContext, type ParentProps, useContext } from "solid-js";
import { createResource } from "solid-js";

import type { CurrentUser } from "~/actions/auth-session";
import { getMe } from "~/actions/auth-session";

interface SessionContextValue {
  user: () => CurrentUser | null | undefined;
  currentUser: () => CurrentUser;
}

const SessionContext = createContext<SessionContextValue>();

export function SessionProvider(props: ParentProps) {
  const [user] = createResource(getMe);
  const currentUser = () => {
    const value = user();
    if (!value) {
      throw new Error("Authenticated app rendered without a valid user");
    }
    return value;
  };

  return (
    <SessionContext.Provider value={{ user, currentUser }}>
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
