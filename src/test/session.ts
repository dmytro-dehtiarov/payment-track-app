import { encode } from "next-auth/jwt";

const TEST_SESSION_COOKIE_NAME = "authjs.session-token";

/**
 * Mints a real Auth.js session JWT (same encode() the app itself uses) so
 * route-handler tests can attach a genuine session cookie rather than
 * stubbing auth away.
 */
export async function createSessionCookieHeader(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set for tests (see vitest.config.mts).");

  const value = await encode({
    secret,
    salt: TEST_SESSION_COOKIE_NAME,
    token: { name: "Admin", sub: "admin" },
  });

  return `${TEST_SESSION_COOKIE_NAME}=${value}`;
}
