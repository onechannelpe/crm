import type { ImageSource } from "@crm/images";

import logoAvif from "~/assets/images/logo/logo.avif";
import logoIco from "~/assets/images/logo/logo.ico";
import logoWebp from "~/assets/images/logo/logo.webp";

export const PLATFORM_NAME = "Culqi360";

// Pre-generated format variants (checked into git), imported directly rather
// than through the sharp-based `?responsive` transform: that transform only
// runs inside Vite's plugin pipeline, but Nitro's prerenderer rebuilds the
// server entry from source with a standalone rolldown bundler that never
// loads Vite plugins, so a `?responsive` import fails there with
// UNLOADABLE_DEPENDENCY. Plain static imports are understood natively by
// every bundler in play (confirmed by entry-server.tsx's favicon import,
// which already survives that same prerender rebuild).
export const PLATFORM_LOGO: ImageSource = {
  avif: logoAvif,
  webp: logoWebp,
  fallback: logoIco,
};
