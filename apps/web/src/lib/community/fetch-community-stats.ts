export type CommunityStats = {
  github: string;
  discord: string;
};

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

async function fetchGithubStars(): Promise<number | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/onechannelpe/crm",
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!isJsonObject(data)) return null;
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null;
  } catch {
    return null;
  }
}

async function fetchDiscordMembers(): Promise<number | null> {
  try {
    const response = await fetch(
      "https://discord.com/api/guilds/1130383047699738754/widget.json",
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!isJsonObject(data)) return null;
    return typeof data.presence_count === "number" ? data.presence_count : null;
  } catch {
    return null;
  }
}

export async function fetchCommunityStats(): Promise<CommunityStats> {
  const [githubStars, discordMembers] = await Promise.all([
    fetchGithubStars(),
    fetchDiscordMembers(),
  ]);

  return {
    github: githubStars == null ? "" : formatCompactCount(githubStars),
    discord: discordMembers == null ? "" : formatCompactCount(discordMembers),
  };
}
