export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function readJsonBody(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
