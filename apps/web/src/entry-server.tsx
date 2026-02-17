// @refresh reload
import type { DocumentComponentProps } from "@solidjs/start/server";
import { createHandler, StartServer } from "@solidjs/start/server";

import { migrateToLatest } from "~/lib/db/migrate";
import { seedIfEmpty } from "~/lib/db/seed";
import "~/lib/auth/session/cleanup";

await migrateToLatest();
await seedIfEmpty();

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }: DocumentComponentProps) => (
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>CRM | One Channel</title>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
