import { getSupabaseAnonKey, getSupabaseUrl } from "./env.ts";
import { getBearerToken, json } from "./http.ts";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
};

export type AuthResult = { success: true; user: AuthenticatedUser; token: string } | { success: false; response: Response };

export async function requireSupabaseUser(request: Request): Promise<AuthResult> {
  const anonKey = getSupabaseAnonKey();
  if (!anonKey) {
    return { success: false, response: json({ success: false, reason: "Supabase anon key is not configured on the backend." }, 503) };
  }

  const token = getBearerToken(request);
  if (!token) {
    return { success: false, response: json({ success: false, reason: "Missing Supabase session token." }, 401) };
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    return { success: false, response: json({ success: false, reason: "Supabase session is invalid or expired." }, 401) };
  }

  return { success: true, user: (await response.json()) as AuthenticatedUser, token };
}
