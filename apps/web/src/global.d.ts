/// <reference types="@solidjs/start/env" />

import type { AuthSession } from "~/lib/auth/session-types";

declare namespace App {
  interface RequestEventLocals {
    session?: AuthSession;
  }
}
