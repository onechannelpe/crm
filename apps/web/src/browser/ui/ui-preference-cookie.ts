import { getRequestEvent, isServer } from "solid-js/web";

export type UiPreferenceCookieCodec<T> = {
  decode: (value: string) => T | null;
  encode: (value: T) => string;
};

type UiPreferenceCookieOptions<T> = {
  name: string;
  maxAgeSeconds: number;
  codec: UiPreferenceCookieCodec<T>;
};

export const booleanUiPreferenceCookieCodec = {
  decode(value: string): boolean | null {
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  },
  encode: String,
} satisfies UiPreferenceCookieCodec<boolean>;

function readBrowserCookie(name: string): string | null {
  return readCookieHeader(document.cookie, name);
}

function readServerCookie(name: string): string | null {
  const cookieHeader = getRequestEvent()?.request.headers.get("cookie");
  return cookieHeader ? readCookieHeader(cookieHeader, name) : null;
}

function readCookieHeader(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;

  for (const rawCookie of cookieHeader.split(";")) {
    const cookie = rawCookie.trim();
    if (!cookie.startsWith(prefix)) continue;

    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch {
      return null;
    }
  }

  return null;
}

export function defineUiPreferenceCookie<T>(
  options: UiPreferenceCookieOptions<T>,
) {
  return {
    read(): T | null {
      const raw = isServer
        ? readServerCookie(options.name)
        : readBrowserCookie(options.name);

      return raw === null ? null : options.codec.decode(raw);
    },

    write(value: T): void {
      if (isServer) return;

      const encoded = encodeURIComponent(options.codec.encode(value));
      document.cookie = `${options.name}=${encoded}; Path=/; Max-Age=${options.maxAgeSeconds}; SameSite=Lax`;
    },
  };
}
