/// <reference types="@solidjs/start/env" />

import type { AuthSession } from "~/lib/auth/access/session-types";

declare namespace App {
  interface RequestEventLocals {
    session?: AuthSession;
  }
}
