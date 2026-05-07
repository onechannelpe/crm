type SocialLink = {
  icon: "github" | "discord" | "x" | "linkedin";
  label?: string;
};

export function mergeSocialLinkLabels<T extends SocialLink>(
  links: readonly T[],
  labels: { github: string; discord: string },
): T[] {
  return links.map((link) => {
    if (link.icon === "github") {
      return { ...link, label: labels.github };
    }

    if (link.icon === "discord") {
      return { ...link, label: labels.discord };
    }

    return link;
  });
}
