import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  name: string | null;
}

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

/**
 * Route Handlers are protected primarily by the `authorized` callback in
 * proxy (src/proxy.ts + src/auth.ts), but each mutation route re-checks the
 * session itself as defense in depth -- consistent with change-password.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req: request, secret, secureCookie: isSecureRequest(request) });
  if (!token?.sub) return null;

  return { id: token.sub, name: typeof token.name === "string" ? token.name : null };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Returns the session user, or a ready-to-return 401 NextResponse. */
export async function requireSessionUser(request: Request): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(request);
  return user ?? unauthorized();
}
