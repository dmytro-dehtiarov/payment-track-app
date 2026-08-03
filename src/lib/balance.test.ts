import { afterAll, describe, expect, it } from "vitest";
import { calculateBalance, getClientBalance } from "@/lib/balance";
import { createTestDb } from "@/test/db";

describe("calculateBalance (pure)", () => {
  it("returns 0 for a client with no invoices or payments", () => {
    expect(calculateBalance([], [])).toBe(0);
  });

  it("sums invoices when there are no payments", () => {
    expect(calculateBalance([{ amountMinor: 10000 }, { amountMinor: 20000 }], [])).toBe(30000);
  });

  it("returns a negative balance when there are only payments", () => {
    expect(calculateBalance([], [{ amountMinor: 15000 }])).toBe(-15000);
  });

  it("returns a negative balance on overpayment", () => {
    expect(calculateBalance([{ amountMinor: 10000 }], [{ amountMinor: 30000 }])).toBe(-20000);
  });

  it("returns exactly 0 when invoices and payments match", () => {
    expect(calculateBalance([{ amountMinor: 50000 }], [{ amountMinor: 50000 }])).toBe(0);
  });

  it("sums correctly with several interleaved invoices and payments", () => {
    const invoices = [{ amountMinor: 10000 }, { amountMinor: 20000 }, { amountMinor: 5000 }];
    const payments = [{ amountMinor: 8000 }, { amountMinor: 7000 }];
    expect(calculateBalance(invoices, payments)).toBe(20000);
  });
});

describe("getClientBalance (real SQLite aggregation)", () => {
  const testDb = createTestDb();

  afterAll(async () => {
    await testDb.cleanup();
  });

  async function createClient() {
    return testDb.prisma.client.create({
      data: { name: "Test Client", type: "person" },
    });
  }

  it("returns 0 for a client with no records", async () => {
    const client = await createClient();
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(0);
  });

  it("sums invoices only", async () => {
    const client = await createClient();
    await testDb.prisma.invoice.createMany({
      data: [
        { clientId: client.id, date: new Date("2026-01-01"), amountMinor: 10000 },
        { clientId: client.id, date: new Date("2026-01-05"), amountMinor: 25000 },
      ],
    });
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(35000);
  });

  it("sums payments only, yielding a negative balance", async () => {
    const client = await createClient();
    await testDb.prisma.payment.create({
      data: { clientId: client.id, date: new Date("2026-01-01"), amountMinor: 12000, method: "cash" },
    });
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(-12000);
  });

  it("handles overpayment", async () => {
    const client = await createClient();
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2026-01-01"), amountMinor: 10000 },
    });
    await testDb.prisma.payment.create({
      data: { clientId: client.id, date: new Date("2026-01-10"), amountMinor: 15000, method: "cash" },
    });
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(-5000);
  });

  it("is exactly 0 when invoices and payments match", async () => {
    const client = await createClient();
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2026-01-01"), amountMinor: 42000 },
    });
    await testDb.prisma.payment.create({
      data: { clientId: client.id, date: new Date("2026-01-15"), amountMinor: 42000, method: "cash" },
    });
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(0);
  });

  it("aggregates several interleaved invoices and payments across dates correctly", async () => {
    const client = await createClient();
    await testDb.prisma.invoice.createMany({
      data: [
        { clientId: client.id, date: new Date("2026-03-01"), amountMinor: 10000 },
        { clientId: client.id, date: new Date("2026-01-15"), amountMinor: 20000 },
        { clientId: client.id, date: new Date("2026-02-10"), amountMinor: 5000 },
      ],
    });
    await testDb.prisma.payment.createMany({
      data: [
        { clientId: client.id, date: new Date("2026-02-01"), amountMinor: 8000, method: "cash" },
        { clientId: client.id, date: new Date("2026-03-15"), amountMinor: 7000, method: "cash" },
      ],
    });
    expect(await getClientBalance(client.id, testDb.prisma)).toBe(20000);
  });

  it("does not lose precision summing hundreds of rows through real SQLite SUM()", async () => {
    const client = await createClient();
    const ROW_COUNT = 500;

    // Odd, non-round amounts (in minor units) specifically to catch any
    // rounding drift that a Decimal/NUMERIC column could introduce -- Int
    // storage should sum exactly regardless.
    const invoiceAmounts = Array.from({ length: ROW_COUNT }, (_, i) => 1000 + (i % 37) * 13);
    const paymentAmounts = Array.from({ length: ROW_COUNT }, (_, i) => 500 + (i % 23) * 7);

    await testDb.prisma.invoice.createMany({
      data: invoiceAmounts.map((amountMinor, i) => ({
        clientId: client.id,
        date: new Date(2026, 0, 1 + (i % 28)),
        amountMinor,
      })),
    });
    await testDb.prisma.payment.createMany({
      data: paymentAmounts.map((amountMinor, i) => ({
        clientId: client.id,
        date: new Date(2026, 1, 1 + (i % 28)),
        amountMinor,
        method: "cash" as const,
      })),
    });

    const expectedBalance =
      invoiceAmounts.reduce((sum, n) => sum + n, 0) - paymentAmounts.reduce((sum, n) => sum + n, 0);

    expect(await getClientBalance(client.id, testDb.prisma)).toBe(expectedBalance);
  });

  it("scopes aggregation to the given clientId and ignores other clients' records", async () => {
    const clientA = await createClient();
    const clientB = await createClient();
    await testDb.prisma.invoice.create({
      data: { clientId: clientA.id, date: new Date("2026-01-01"), amountMinor: 10000 },
    });
    await testDb.prisma.invoice.create({
      data: { clientId: clientB.id, date: new Date("2026-01-01"), amountMinor: 99999 },
    });
    expect(await getClientBalance(clientA.id, testDb.prisma)).toBe(10000);
  });
});
