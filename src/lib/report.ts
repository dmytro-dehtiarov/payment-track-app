import { prisma } from "@/lib/db";

export interface TurnoverSummary {
  balanceAtStart: number;
  totalInvoiced: number;
  totalPaid: number;
  netChange: number;
  balanceAtEnd: number;
}

export interface ClientTurnoverRow extends TurnoverSummary {
  clientId: string;
  clientName: string;
}

export interface TurnoverReport extends TurnoverSummary {
  clients: ClientTurnoverRow[];
}

export interface TurnoverReportParams {
  from: Date;
  to: Date;
  clientId?: string;
}

function computeSummary(
  invoicedBefore: number,
  paidBefore: number,
  invoicedInPeriod: number,
  paidInPeriod: number
): TurnoverSummary {
  const balanceAtStart = invoicedBefore - paidBefore;
  const netChange = invoicedInPeriod - paidInPeriod;
  return {
    balanceAtStart,
    totalInvoiced: invoicedInPeriod,
    totalPaid: paidInPeriod,
    netChange,
    balanceAtEnd: balanceAtStart + netChange,
  };
}

function toAmountMap(rows: { clientId: string; _sum: { amountMinor: number | null } }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.clientId, row._sum.amountMinor ?? 0);
  return map;
}

/**
 * Archived clients are always included -- archiving only hides a client from
 * the home list (Architecture.md ch.4.1), it doesn't remove them from
 * financial history/reporting.
 */
export async function getTurnoverReport(
  { from, to, clientId }: TurnoverReportParams,
  db: typeof prisma = prisma
): Promise<TurnoverReport> {
  const clients = await db.client.findMany({
    where: clientId ? { id: clientId } : {},
    select: { id: true, name: true },
  });
  const clientIds = clients.map((c) => c.id);

  const [invoicedBefore, paidBefore, invoicedInPeriod, paidInPeriod] = await Promise.all([
    db.invoice.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, date: { lt: from } },
      _sum: { amountMinor: true },
    }),
    db.payment.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, date: { lt: from } },
      _sum: { amountMinor: true },
    }),
    db.invoice.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, date: { gte: from, lte: to } },
      _sum: { amountMinor: true },
    }),
    db.payment.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds }, date: { gte: from, lte: to } },
      _sum: { amountMinor: true },
    }),
  ]);

  const invoicedBeforeMap = toAmountMap(invoicedBefore);
  const paidBeforeMap = toAmountMap(paidBefore);
  const invoicedInPeriodMap = toAmountMap(invoicedInPeriod);
  const paidInPeriodMap = toAmountMap(paidInPeriod);

  const clientRows: ClientTurnoverRow[] = clients.map((client) => ({
    clientId: client.id,
    clientName: client.name,
    ...computeSummary(
      invoicedBeforeMap.get(client.id) ?? 0,
      paidBeforeMap.get(client.id) ?? 0,
      invoicedInPeriodMap.get(client.id) ?? 0,
      paidInPeriodMap.get(client.id) ?? 0
    ),
  }));

  const totals = clientRows.reduce<TurnoverSummary>(
    (acc, row) => ({
      balanceAtStart: acc.balanceAtStart + row.balanceAtStart,
      totalInvoiced: acc.totalInvoiced + row.totalInvoiced,
      totalPaid: acc.totalPaid + row.totalPaid,
      netChange: acc.netChange + row.netChange,
      balanceAtEnd: acc.balanceAtEnd + row.balanceAtEnd,
    }),
    { balanceAtStart: 0, totalInvoiced: 0, totalPaid: 0, netChange: 0, balanceAtEnd: 0 }
  );

  return { ...totals, clients: clientRows };
}
