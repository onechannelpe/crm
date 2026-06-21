const PII_HEADER_SNIPPETS = ["forwarded", "-ip", "remote-", "via", "-user"];

export function sentryDefaultDataCollection() {
  return {
    userInfo: false,
    cookies: { deny: PII_HEADER_SNIPPETS },
    httpHeaders: {
      request: { deny: PII_HEADER_SNIPPETS },
      response: { deny: PII_HEADER_SNIPPETS },
    },
    httpBodies: [],
    queryParams: { deny: PII_HEADER_SNIPPETS },
    genAI: { inputs: false, outputs: false },
    stackFrameVariables: true,
    frameContextLines: 7,
  };
}
