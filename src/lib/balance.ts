import { prisma } from "@/lib/db";

export interface AmountRecord {
  amountMinor: number;
}

/**
 * balance > 0: client owes me; balance < 0: I owe the client; 0: settled.
 * Per Architecture.md ch.3, the balance is never stored -- always derived.
 */
export function calculateBalance(invoices: AmountRecord[], payments: AmountRecord[]): number {
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.amountMinor, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
  return totalInvoiced - totalPaid;
}

type BalanceDb = Pick<typeof prisma, "invoice" | "payment">;

export async function getClientBalance(clientId: string, db: BalanceDb = prisma): Promise<number> {
  const [invoiceAgg, paymentAgg] = await Promise.all([
    db.invoice.aggregate({ where: { clientId }, _sum: { amountMinor: true } }),
    db.payment.aggregate({ where: { clientId }, _sum: { amountMinor: true } }),
  ]);
  return (invoiceAgg._sum.amountMinor ?? 0) - (paymentAgg._sum.amountMinor ?? 0);
}
