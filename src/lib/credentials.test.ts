import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { loginRateLimitKey, verifyPassword } from "@/lib/credentials";

function fakeDb(passwordHash: string | null) {
  return {
    settings: {
      async findFirst() {
        return passwordHash ? { passwordHash } : null;
      },
    },
  };
}

describe("verifyPassword", () => {
  it("rejects when no password is supplied", async () => {
    const hash = await bcrypt.hash("correct-horse", 4);
    expect(await verifyPassword(undefined, "key:no-password", fakeDb(hash))).toBe(false);
  });

  it("accepts the correct password", async () => {
    const hash = await bcrypt.hash("correct-horse", 4);
    expect(await verifyPassword("correct-horse", "key:correct", fakeDb(hash))).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await bcrypt.hash("correct-horse", 4);
    expect(await verifyPassword("wrong-password", "key:incorrect", fakeDb(hash))).toBe(false);
  });

  it("rejects when no Settings row exists yet", async () => {
    expect(await verifyPassword("anything", "key:no-settings", fakeDb(null))).toBe(false);
  });

  it("locks out further attempts after 5 failures within the window", async () => {
    const hash = await bcrypt.hash("correct-horse", 4);
    const key = "key:lockout";

    for (let i = 0; i < 5; i++) {
      expect(await verifyPassword("wrong-password", key, fakeDb(hash))).toBe(false);
    }

    // Even the correct password is now rejected because the window is exhausted.
    expect(await verifyPassword("correct-horse", key, fakeDb(hash))).toBe(false);
  });

  it("resets the attempt counter after a successful login", async () => {
    const hash = await bcrypt.hash("correct-horse", 4);
    const key = "key:reset-after-success";

    expect(await verifyPassword("wrong-password", key, fakeDb(hash))).toBe(false);
    expect(await verifyPassword("correct-horse", key, fakeDb(hash))).toBe(true);

    // Counter was reset by the successful attempt, so failures start fresh.
    for (let i = 0; i < 4; i++) {
      expect(await verifyPassword("wrong-password", key, fakeDb(hash))).toBe(false);
    }
    expect(await verifyPassword("correct-horse", key, fakeDb(hash))).toBe(true);
  });
});

describe("loginRateLimitKey", () => {
  it("extracts the first IP from x-forwarded-for", () => {
    const request = new Request("http://localhost/api/auth/callback/credentials", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(loginRateLimitKey(request)).toBe("login:203.0.113.5");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    const request = new Request("http://localhost/api/auth/callback/credentials");
    expect(loginRateLimitKey(request)).toBe("login:unknown");
  });
});
