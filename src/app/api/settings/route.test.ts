import { afterAll, describe, expect, it, vi } from "vitest";
import type { createTestDb } from "@/test/db";

const mocks = vi.hoisted(() => ({
  testDb: undefined as ReturnType<typeof createTestDb> | undefined,
}));

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("@/test/db");
  mocks.testDb = createTestDb();
  return { prisma: mocks.testDb.prisma };
});

import { createSessionCookieHeader } from "@/test/session";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";

const testDb = mocks.testDb!;

afterAll(async () => {
  await testDb.cleanup();
});

async function seedSettings() {
  return testDb.prisma.settings.create({
    data: { theme: "light", currencySymbol: "грн", language: "ru", passwordHash: "irrelevant-hash" },
  });
}

async function authedRequest(url: string, method: string, body?: unknown): Promise<Request> {
  const cookie = await createSessionCookieHeader();
  const headers: Record<string, string> = { cookie };
  let requestBody: string | undefined;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  return new Request(url, { method, headers, body: requestBody });
}

describe("GET /api/settings", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const response = await getSettings(new Request("http://localhost/api/settings"));
    expect(response.status).toBe(401);
  });

  it("returns settings without the password hash", async () => {
    await seedSettings();
    const response = await getSettings(await authedRequest("http://localhost/api/settings", "GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ theme: "light", currencySymbol: "грн", language: "ru" });
    expect(body.passwordHash).toBeUndefined();
  });
});

describe("PATCH /api/settings", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const response = await patchSettings(
      new Request("http://localhost/api/settings", { method: "PATCH", body: JSON.stringify({ theme: "dark" }) })
    );
    expect(response.status).toBe(401);
  });

  it("rejects an invalid theme value with 400", async () => {
    const response = await patchSettings(
      await authedRequest("http://localhost/api/settings", "PATCH", { theme: "purple" })
    );
    expect(response.status).toBe(400);
  });

  it("updates theme, currency, and language", async () => {
    const response = await patchSettings(
      await authedRequest("http://localhost/api/settings", "PATCH", {
        theme: "dark",
        currencySymbol: "$",
        language: "en",
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ theme: "dark", currencySymbol: "$", language: "en" });

    const getResponse = await getSettings(await authedRequest("http://localhost/api/settings", "GET"));
    expect(await getResponse.json()).toMatchObject({ theme: "dark", currencySymbol: "$", language: "en" });
  });
});
