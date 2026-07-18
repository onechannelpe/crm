// The invite link is a pure function of the stored token and a configured
// origin, so it can be rebuilt anywhere: on the settings page, on resend, or in
// a background re-delivery that has no incoming request. Origin comes from
// APP_PUBLIC_ORIGIN, never sniffed from the request that happens to be running.
export function inviteLink(origin: string, token: string): string {
  return `${origin}/login/invite/${encodeURIComponent(token)}`;
}
