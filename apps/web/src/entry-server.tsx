// @refresh reload
import type { DocumentComponentProps } from "@solidjs/start/server";
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(
  () => {
    return (
      <StartServer
        document={({ assets, children, scripts }: DocumentComponentProps) => (
          <html lang="es">
            <head>
              <meta charset="utf-8" />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              />
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
    );
  },
  (event) => ({
    mode: "async",
    nonce: event.locals.nonce,
  }),
);
