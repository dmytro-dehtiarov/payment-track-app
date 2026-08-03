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

import { getClientBalance } from "@/lib/balance";
import { createSessionCookieHeader } from "@/test/session";

import { GET as getClientRoute, PATCH as patchClientRoute, DELETE as deleteClientRoute } from "@/app/api/clients/[id]/route";
import { POST as createInvoiceRoute } from "@/app/api/clients/[id]/invoices/route";
import { POST as createPaymentRoute } from "@/app/api/clients/[id]/payments/route";
import { POST as createClientRoute } from "@/app/api/clients/route";
import { DELETE as deleteInvoiceRoute, PATCH as patchInvoiceRoute } from "@/app/api/invoices/[id]/route";
import { DELETE as deletePaymentRoute, PATCH as patchPaymentRoute } from "@/app/api/payments/[id]/route";

const testDb = mocks.testDb!;

afterAll(async () => {
  await testDb.cleanup();
});

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

function unauthedRequest(url: string, method: string, body?: unknown): Request {
  const headers: Record<string, string> = {};
  let requestBody: string | undefined;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  return new Request(url, { method, headers, body: requestBody });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function createTestClient(name = "Test Client") {
  const request = await authedRequest("http://localhost/api/clients", "POST", {
    name,
    type: "person",
  });
  const response = await createClientRoute(request);
  expect(response.status).toBe(201);
  return response.json() as Promise<{ id: string }>;
}

describe("POST /api/clients", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const request = unauthedRequest("http://localhost/api/clients", "POST", {
      name: "Nobody",
      type: "person",
    });
    const response = await createClientRoute(request);
    expect(response.status).toBe(401);
  });

  it("rejects an invalid body with 400", async () => {
    const request = await authedRequest("http://localhost/api/clients", "POST", { name: "" });
    const response = await createClientRoute(request);
    expect(response.status).toBe(400);
  });

  it("creates a client and returns 201", async () => {
    const request = await authedRequest("http://localhost/api/clients", "POST", {
      name: "Иван Петров",
      type: "person",
      contactInfo: "+380001112233",
    });
    const response = await createClientRoute(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ name: "Иван Петров", type: "person", archived: false });
  });
});

describe("GET /api/clients/:id", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const client = await createTestClient();
    const request = unauthedRequest(`http://localhost/api/clients/${client.id}`, "GET");
    const response = await getClientRoute(request, ctx(client.id));
    expect(response.status).toBe(401);
  });

  it("returns 404 for a missing client", async () => {
    const request = await authedRequest("http://localhost/api/clients/does-not-exist", "GET");
    const response = await getClientRoute(request, ctx("does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("returns the client with history and computed balance", async () => {
    const client = await createTestClient();
    await createInvoiceRoute(
      await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
        date: "2026-01-01",
        amountMinor: 10000,
      }),
      ctx(client.id)
    );

    const request = await authedRequest(`http://localhost/api/clients/${client.id}`, "GET");
    const response = await getClientRoute(request, ctx(client.id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.balance).toBe(10000);
    expect(body.invoices).toHaveLength(1);
    expect(body.payments).toHaveLength(0);
  });
});

describe("PATCH /api/clients/:id", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const client = await createTestClient();
    const request = unauthedRequest(`http://localhost/api/clients/${client.id}`, "PATCH", { name: "New Name" });
    const response = await patchClientRoute(request, ctx(client.id));
    expect(response.status).toBe(401);
  });

  it("returns 404 for a missing client", async () => {
    const request = await authedRequest("http://localhost/api/clients/does-not-exist", "PATCH", { name: "X" });
    const response = await patchClientRoute(request, ctx("does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("updates the client's fields", async () => {
    const client = await createTestClient();
    const request = await authedRequest(`http://localhost/api/clients/${client.id}`, "PATCH", {
      name: "Обновлённое Имя",
      contactInfo: "new@example.com",
    });
    const response = await patchClientRoute(request, ctx(client.id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Обновлённое Имя");
    expect(body.contactInfo).toBe("new@example.com");
  });
});

describe("DELETE /api/clients/:id (soft delete)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const client = await createTestClient();
    const request = unauthedRequest(`http://localhost/api/clients/${client.id}`, "DELETE");
    const response = await deleteClientRoute(request, ctx(client.id));
    expect(response.status).toBe(401);
  });

  it("returns 404 for a missing client", async () => {
    const request = await authedRequest("http://localhost/api/clients/does-not-exist", "DELETE");
    const response = await deleteClientRoute(request, ctx("does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("archives the client without deleting its history", async () => {
    const client = await createTestClient();
    await createInvoiceRoute(
      await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
        date: "2026-01-01",
        amountMinor: 5000,
      }),
      ctx(client.id)
    );

    const request = await authedRequest(`http://localhost/api/clients/${client.id}`, "DELETE");
    const response = await deleteClientRoute(request, ctx(client.id));
    expect(response.status).toBe(204);

    const stillExists = await testDb.prisma.client.findUnique({ where: { id: client.id } });
    expect(stillExists?.archived).toBe(true);
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(5000);
  });
});

describe("POST /api/clients/:id/invoices", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const client = await createTestClient();
    const request = unauthedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
      date: "2026-01-01",
      amountMinor: 1000,
    });
    const response = await createInvoiceRoute(request, ctx(client.id));
    expect(response.status).toBe(401);
  });

  it("returns 404 when the client does not exist", async () => {
    const request = await authedRequest("http://localhost/api/clients/does-not-exist/invoices", "POST", {
      date: "2026-01-01",
      amountMinor: 1000,
    });
    const response = await createInvoiceRoute(request, ctx("does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("rejects an invalid body with 400", async () => {
    const client = await createTestClient();
    const request = await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
      date: "2026-01-01",
      amountMinor: -500,
    });
    const response = await createInvoiceRoute(request, ctx(client.id));
    expect(response.status).toBe(400);
  });

  it("creates an invoice and recalculates the client's balance", async () => {
    const client = await createTestClient();
    const request = await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
      date: "2026-01-01",
      amountMinor: 25000,
      description: "Consulting",
    });
    const response = await createInvoiceRoute(request, ctx(client.id));
    expect(response.status).toBe(201);
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(25000);
  });
});

describe("PATCH/DELETE /api/invoices/:id", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const client = await createTestClient();
    const invoice = await (
      await createInvoiceRoute(
        await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
          date: "2026-01-01",
          amountMinor: 1000,
        }),
        ctx(client.id)
      )
    ).json();

    const patchResponse = await patchInvoiceRoute(
      unauthedRequest(`http://localhost/api/invoices/${invoice.id}`, "PATCH", { amountMinor: 2000 }),
      ctx(invoice.id)
    );
    expect(patchResponse.status).toBe(401);

    const deleteResponse = await deleteInvoiceRoute(
      unauthedRequest(`http://localhost/api/invoices/${invoice.id}`, "DELETE"),
      ctx(invoice.id)
    );
    expect(deleteResponse.status).toBe(401);
  });

  it("updates the amount and recalculates the balance", async () => {
    const client = await createTestClient();
    const invoice = await (
      await createInvoiceRoute(
        await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
          date: "2026-01-01",
          amountMinor: 10000,
        }),
        ctx(client.id)
      )
    ).json();

    const response = await patchInvoiceRoute(
      await authedRequest(`http://localhost/api/invoices/${invoice.id}`, "PATCH", { amountMinor: 40000 }),
      ctx(invoice.id)
    );
    expect(response.status).toBe(200);
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(40000);
  });

  it("hard-deletes the invoice and removes it from the balance aggregation", async () => {
    const client = await createTestClient();
    const invoice = await (
      await createInvoiceRoute(
        await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
          date: "2026-01-01",
          amountMinor: 15000,
        }),
        ctx(client.id)
      )
    ).json();

    const response = await deleteInvoiceRoute(
      await authedRequest(`http://localhost/api/invoices/${invoice.id}`, "DELETE"),
      ctx(invoice.id)
    );
    expect(response.status).toBe(204);

    const stillThere = await testDb.prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(stillThere).toBeNull();
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(0);
  });
});

describe("POST /api/clients/:id/payments and PATCH/DELETE /api/payments/:id", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const client = await createTestClient();
    const request = unauthedRequest(`http://localhost/api/clients/${client.id}/payments`, "POST", {
      date: "2026-01-01",
      amountMinor: 1000,
    });
    const response = await createPaymentRoute(request, ctx(client.id));
    expect(response.status).toBe(401);
  });

  it("creates a payment, recalculates the balance, then hard-deletes it", async () => {
    const client = await createTestClient();
    await createInvoiceRoute(
      await authedRequest(`http://localhost/api/clients/${client.id}/invoices`, "POST", {
        date: "2026-01-01",
        amountMinor: 30000,
      }),
      ctx(client.id)
    );

    const paymentResponse = await createPaymentRoute(
      await authedRequest(`http://localhost/api/clients/${client.id}/payments`, "POST", {
        date: "2026-01-10",
        amountMinor: 12000,
      }),
      ctx(client.id)
    );
    expect(paymentResponse.status).toBe(201);
    const payment = await paymentResponse.json();
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(18000);

    const patchResponse = await patchPaymentRoute(
      await authedRequest(`http://localhost/api/payments/${payment.id}`, "PATCH", { amountMinor: 30000 }),
      ctx(payment.id)
    );
    expect(patchResponse.status).toBe(200);
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(0);

    const deleteResponse = await deletePaymentRoute(
      await authedRequest(`http://localhost/api/payments/${payment.id}`, "DELETE"),
      ctx(payment.id)
    );
    expect(deleteResponse.status).toBe(204);
    expect(await testDb.prisma.payment.findUnique({ where: { id: payment.id } })).toBeNull();
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(30000);
  });
});
