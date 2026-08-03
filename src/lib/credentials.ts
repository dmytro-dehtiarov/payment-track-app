import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

export function loginRateLimitKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `login:${ip}`;
}

type SettingsDb = {
  settings: { findFirst: () => Promise<{ passwordHash: string } | null> };
};

/**
 * Kept free of next-auth/next imports so it can be unit-tested directly
 * without going through the Credentials provider / NextAuth request plumbing.
 */
export async function verifyPassword(
  password: string | undefined,
  rateLimitKey: string,
  db: SettingsDb = prisma
): Promise<boolean> {
  if (!password) return false;

  const { allowed } = checkRateLimit(rateLimitKey);
  if (!allowed) return false;

  const settings = await db.settings.findFirst();
  if (!settings) return false;

  const valid = await bcrypt.compare(password, settings.passwordHash);
  if (!valid) return false;

  resetRateLimit(rateLimitKey);
  return true;
}
