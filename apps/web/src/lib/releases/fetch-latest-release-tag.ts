export async function fetchLatestGithubReleaseTag(): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(
      "https://api.github.com/repos/twentyhq/twenty/releases/latest",
      { headers },
    );

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) {
      return null;
    }
    const tagName = Reflect.get(data, "tag_name");
    return typeof tagName === "string" ? tagName : null;
  } catch {
    return null;
  }
}
