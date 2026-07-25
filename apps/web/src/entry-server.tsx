// @refresh reload
import "~/instrument.server";
import type { DocumentComponentProps } from "@solidjs/start/server";
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

import favicon from "~/assets/images/logo/logo.ico";

import { CSRF_CONFIG } from "./shared/csrf-config";

function RequestMeta() {
  const event = getRequestEvent();
  const csrfToken = event?.locals?.requestContext?.csrfToken;

  // eslint-disable-next-line solid/components-return-once
  return csrfToken ? (
    <meta name={CSRF_CONFIG.META_NAME} content={csrfToken} />
  ) : null;
}

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
              <RequestMeta />
              <link rel="icon" type="image/x-icon" href={favicon} />
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
  (event) => {
    return {
      mode: "async",
      nonce: event.locals.nonce,
    };
  },
);
