export type JsonBody = Record<string, unknown>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8"
    }
  });
}

export function options(): Response {
  return json({ success: true });
}

export async function readJson<T extends JsonBody>(request: Request): Promise<{ success: true; body: T } | { success: false; response: Response }> {
  try {
    const body = (await request.json()) as T;
    return { success: true, body };
  } catch {
    return { success: false, response: json({ success: false, reason: "Request body must be valid JSON." }, 400) };
  }
}

export function getBearerToken(request: Request): string {
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
}

export async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
