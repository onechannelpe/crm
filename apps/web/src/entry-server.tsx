// @refresh reload
import type { DocumentComponentProps } from "@solidjs/start/server";
import { createHandler, StartServer } from "@solidjs/start/server";
import { migrateToLatest } from "~/lib/db/migrate";
import { seedIfEmpty } from "~/lib/db/seed";
import "~/lib/auth/cleanup";

await migrateToLatest();
await seedIfEmpty();

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }: DocumentComponentProps) => (
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <title>CRM | OneChannel</title>
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
