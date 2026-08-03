import { afterAll, describe, expect, it } from "vitest";
import { getTurnoverReport } from "@/lib/report";
import { createTestDb } from "@/test/db";

const testDb = createTestDb();

afterAll(async () => {
  await testDb.cleanup();
});

async function createClient(name: string, archived = false) {
  return testDb.prisma.client.create({ data: { name, type: "person", archived } });
}

describe("getTurnoverReport", () => {
  it("gives balanceAtStart = 0 for a client with no records before the period", async () => {
    const client = await createClient("No Prior History");
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2026-02-01"), amountMinor: 10000 },
    });

    const report = await getTurnoverReport(
      { from: new Date("2026-01-01"), to: new Date("2026-01-31"), clientId: client.id },
      testDb.prisma
    );

    expect(report.balanceAtStart).toBe(0);
    // The invoice is dated after `to`, so it shouldn't appear in the period either.
    expect(report.totalInvoiced).toBe(0);
  });

  it("computes balanceAtStart correctly from records strictly before the period", async () => {
    const client = await createClient("Prior History");
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2025-12-01"), amountMinor: 50000 },
    });
    await testDb.prisma.payment.create({
      data: { clientId: client.id, date: new Date("2025-12-15"), amountMinor: 20000, method: "cash" },
    });
    // On the boundary date itself -- should NOT count toward balanceAtStart.
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2026-01-01"), amountMinor: 5000 },
    });

    const report = await getTurnoverReport(
      { from: new Date("2026-01-01"), to: new Date("2026-01-31"), clientId: client.id },
      testDb.prisma
    );

    expect(report.balanceAtStart).toBe(30000);
    expect(report.totalInvoiced).toBe(5000);
  });

  it("always satisfies balanceAtEnd = balanceAtStart + netChange", async () => {
    const client = await createClient("Balance Invariant");
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2025-06-01"), amountMinor: 100000 },
    });
    await testDb.prisma.payment.create({
      data: { clientId: client.id, date: new Date("2026-01-10"), amountMinor: 40000, method: "cash" },
    });
    await testDb.prisma.invoice.create({
      data: { clientId: client.id, date: new Date("2026-01-20"), amountMinor: 15000 },
    });

    const report = await getTurnoverReport(
      { from: new Date("2026-01-01"), to: new Date("2026-01-31"), clientId: client.id },
      testDb.prisma
    );

    expect(report.balanceAtEnd).toBe(report.balanceAtStart + report.netChange);
    expect(report.clients[0].balanceAtEnd).toBe(report.clients[0].balanceAtStart + report.clients[0].netChange);
  });

  it("includes archived clients in the report", async () => {
    const archived = await createClient("Archived Client Report Test", true);
    await testDb.prisma.invoice.create({
      data: { clientId: archived.id, date: new Date("2026-01-05"), amountMinor: 7500 },
    });

    const report = await getTurnoverReport(
      { from: new Date("2026-01-01"), to: new Date("2026-01-31"), clientId: archived.id },
      testDb.prisma
    );

    expect(report.clients).toHaveLength(1);
    expect(report.totalInvoiced).toBe(7500);
  });

  it("aggregates top-level totals across all clients when no clientId filter is given", async () => {
    const clientA = await createClient("Aggregate A");
    const clientB = await createClient("Aggregate B");
    await testDb.prisma.invoice.create({
      data: { clientId: clientA.id, date: new Date("2026-04-10"), amountMinor: 20000 },
    });
    await testDb.prisma.invoice.create({
      data: { clientId: clientB.id, date: new Date("2026-04-15"), amountMinor: 30000 },
    });
    await testDb.prisma.payment.create({
      data: { clientId: clientB.id, date: new Date("2026-04-20"), amountMinor: 10000, method: "cash" },
    });

    const report = await getTurnoverReport(
      { from: new Date("2026-04-01"), to: new Date("2026-04-30") },
      testDb.prisma
    );

    const rowA = report.clients.find((c) => c.clientId === clientA.id)!;
    const rowB = report.clients.find((c) => c.clientId === clientB.id)!;
    expect(rowA.totalInvoiced).toBe(20000);
    expect(rowB.totalInvoiced).toBe(30000);
    expect(rowB.totalPaid).toBe(10000);

    expect(report.totalInvoiced).toBe(rowA.totalInvoiced + rowB.totalInvoiced);
    expect(report.totalPaid).toBe(rowA.totalPaid + rowB.totalPaid);
    expect(report.netChange).toBe(report.totalInvoiced - report.totalPaid);
  });
});
