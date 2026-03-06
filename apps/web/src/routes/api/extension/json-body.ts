export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    return {
      ok: true,
      body: (await request.json()) as unknown,
    };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid JSON request body" },
        { status: 400 },
      ),
    };
  }
}
