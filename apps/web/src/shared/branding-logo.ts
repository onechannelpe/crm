import type { ImageSource } from "@crm/images";

import logo from "~/assets/images/logo/logo.webp?responsive";

// Only import this from UI-rendered components (never from src/server/**).
// Nitro's prerenderer rebuilds the server entry with a standalone rolldown
// pass that bypasses the Vite plugin pipeline, including the `?responsive`
// transform. Anything reachable from src/server/** gets pulled into that
// rebuild, but UI components rendered through SolidStart's own Vite SSR/
// client build never are, so this import is safe here.
export const PLATFORM_LOGO: ImageSource = logo;
