import type { ImageSource } from "@crm/images";

import logo from "~/assets/images/logo/logo.webp?responsive";

// UI-only. Do not import from src/server/** because the `?responsive` transform
// is unavailable there.
export const PLATFORM_LOGO: ImageSource = logo;
