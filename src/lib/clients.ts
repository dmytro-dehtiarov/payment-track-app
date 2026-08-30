import { calculateBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import type { PaymentMethod } from "@/lib/paymentMethod";

export const CLIENT_SORT_FIELDS = ["balance", "name", "lastActivity"] as const;
export type ClientSortField = (typeof CLIENT_SORT_FIELDS)[number];

export interface ListClientsParams {
  search?: string;
  sortBy?: ClientSortField;
  order?: "asc" | "desc";
  includeArchived?: boolean;
}

export interface ClientListItem {
  id: string;
  name: string;
  type: "person" | "kindergarten" | "school";
  contactInfo: string | null;
  notes: string | null;
  createdAt: Date;
  archived: boolean;
  balance: number;
  lastActivity: Date;
}

export function isClientSortField(value: string | null): value is ClientSortField {
  return (CLIENT_SORT_FIELDS as readonly string[]).includes(value ?? "");
}

export interface LedgerEntry {
  id: string;
  date: Date;
  amountMinor: number;
  description: string | null;
  createdAt: Date;
}

export interface PaymentLedgerEntry extends LedgerEntry {
  method: PaymentMethod;
  methodDetail: string | null;
}

export interface ClientDetail {
  id: string;
  name: string;
  type: ClientListItem["type"];
  contactInfo: string | null;
  notes: string | null;
  createdAt: Date;
  archived: boolean;
  balance: number;
  invoices: LedgerEntry[];
  payments: PaymentLedgerEntry[];
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: { orderBy: { date: "desc" } },
      payments: { orderBy: { date: "desc" } },
    },
  });

  if (!client) return null;

  const balance = calculateBalance(client.invoices, client.payments);
  return { ...client, balance };
}

/**
 * Balance and lastActivity are derived, not stored (Architecture.md ch.3),
 * so sorting happens in JS after loading each client's invoices/payments --
 * fine at this app's scale (personal client list, not a paginated dataset).
 */
export async function listClients(params: ListClientsParams = {}): Promise<ClientListItem[]> {
  const { search = "", sortBy = "lastActivity", order = "desc", includeArchived = false } = params;

  const clients = await prisma.client.findMany({
    where: includeArchived ? {} : { archived: false },
    include: {
      invoices: { select: { amountMinor: true, date: true } },
      payments: { select: { amountMinor: true, date: true } },
    },
  });

  // Filtered in JS rather than via SQL LIKE: SQLite's case-insensitive
  // matching only covers ASCII, and client names here are mostly Cyrillic.
  const searchLower = search.trim().toLocaleLowerCase();
  const matching = searchLower ? clients.filter((c) => c.name.toLocaleLowerCase().includes(searchLower)) : clients;

  const withComputedFields: ClientListItem[] = matching.map((client) => {
    const { invoices, payments, ...clientFields } = client;
    const balance = calculateBalance(invoices, payments);
    const activityDates = [...invoices.map((i) => i.date), ...payments.map((p) => p.date)];
    const lastActivity =
      activityDates.length > 0
        ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
        : client.createdAt;

    return { ...clientFields, balance, lastActivity };
  });

  withComputedFields.sort((a, b) => {
    let comparison: number;
    switch (sortBy) {
      case "balance":
        comparison = a.balance - b.balance;
        break;
      case "name":
        comparison = a.name.localeCompare(b.name, "ru");
        break;
      case "lastActivity":
        comparison = a.lastActivity.getTime() - b.lastActivity.getTime();
        break;
    }
    return order === "asc" ? comparison : -comparison;
  });

  return withComputedFields;
}
