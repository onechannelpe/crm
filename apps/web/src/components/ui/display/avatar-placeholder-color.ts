const AVATAR_HUES = [
  "red",
  "orange",
  "yellow",
  "green",
  "turquoise",
  "blue",
  "purple",
  "pink",
] as const;

export interface AvatarPlaceholderColors {
  background: string;
  foreground: string;
}

function hueForSeed(seed: string): (typeof AVATAR_HUES)[number] {
  let hash = 0;

  for (let index = 0; index < seed.length; index++) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length] ?? "blue";
}

export function avatarPlaceholderColors(seed: string): AvatarPlaceholderColors {
  const hue = hueForSeed(seed);

  return {
    background: `var(--color-${hue}-4)`,
    foreground: `var(--color-${hue}-12)`,
  };
}
