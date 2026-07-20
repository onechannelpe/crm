export function inviteLink(origin: string, token: string): string {
  return `${origin}/login/invite/${encodeURIComponent(token)}`;
}
