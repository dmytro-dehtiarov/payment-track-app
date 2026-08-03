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
import { GET as listClients } from "@/app/api/clients/route";

const testDb = mocks.testDb!;

afterAll(async () => {
  await testDb.cleanup();
});

async function authedGet(url: string) {
  const cookie = await createSessionCookieHeader();
  const response = await listClients(new Request(url, { headers: { cookie } }));
  expect(response.status).toBe(200);
  return response.json();
}

describe("GET /api/clients", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const response = await listClients(new Request("http://localhost/api/clients"));
    expect(response.status).toBe(401);
  });

  it("matches names case-insensitively, including Cyrillic", async () => {
    await testDb.prisma.client.create({ data: { name: "Иван Петров", type: "person" } });
    await testDb.prisma.client.create({ data: { name: "ООО Ромашка", type: "company" } });

    const results = await authedGet("http://localhost/api/clients?search=иван");
    expect(results.map((c: { name: string }) => c.name)).toEqual(["Иван Петров"]);

    const results2 = await authedGet("http://localhost/api/clients?search=РОМАШКА");
    expect(results2.map((c: { name: string }) => c.name)).toEqual(["ООО Ромашка"]);
  });

  it("sorts by balance in both directions", async () => {
    const low = await testDb.prisma.client.create({ data: { name: "Low Balance", type: "person" } });
    const high = await testDb.prisma.client.create({ data: { name: "High Balance", type: "person" } });
    await testDb.prisma.invoice.create({
      data: { clientId: low.id, date: new Date("2026-01-01"), amountMinor: 1000 },
    });
    await testDb.prisma.invoice.create({
      data: { clientId: high.id, date: new Date("2026-01-01"), amountMinor: 90000 },
    });

    const asc = await authedGet("http://localhost/api/clients?sortBy=balance&order=asc");
    const ascNames = asc.map((c: { name: string }) => c.name);
    expect(ascNames.indexOf("Low Balance")).toBeLessThan(ascNames.indexOf("High Balance"));

    const desc = await authedGet("http://localhost/api/clients?sortBy=balance&order=desc");
    const descNames = desc.map((c: { name: string }) => c.name);
    expect(descNames.indexOf("High Balance")).toBeLessThan(descNames.indexOf("Low Balance"));
  });

  it("sorts by lastActivity, falling back to createdAt for a client with no records", async () => {
    await testDb.prisma.client.create({
      data: { name: "No Records Client", type: "person" },
    });
    const recentlyActive = await testDb.prisma.client.create({
      data: { name: "Recently Active Client", type: "person" },
    });
    await testDb.prisma.invoice.create({
      data: { clientId: recentlyActive.id, date: new Date(), amountMinor: 500 },
    });

    const results = await authedGet(
      `http://localhost/api/clients?sortBy=lastActivity&order=desc&search=${encodeURIComponent("Client")}`
    );
    const names = results.map((c: { name: string }) => c.name);
    expect(names.indexOf("Recently Active Client")).toBeLessThan(names.indexOf("No Records Client"));
  });

  it("excludes archived clients by default and includes them with includeArchived=true", async () => {
    const archived = await testDb.prisma.client.create({
      data: { name: "Archived Client Unique", type: "person", archived: true },
    });

    const withoutArchived = await authedGet(
      `http://localhost/api/clients?search=${encodeURIComponent("Archived Client Unique")}`
    );
    expect(withoutArchived).toHaveLength(0);

    const withArchived = await authedGet(
      `http://localhost/api/clients?search=${encodeURIComponent("Archived Client Unique")}&includeArchived=true`
    );
    expect(withArchived.map((c: { id: string }) => c.id)).toContain(archived.id);
  });
});
