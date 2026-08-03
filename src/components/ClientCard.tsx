import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getBalanceDisplay } from "@/lib/balanceDisplay";
import type { ClientListItem } from "@/lib/clients";
import { toBcp47, type Language } from "@/lib/money";

export async function ClientCard({ client, currencySymbol }: { client: ClientListItem; currencySymbol: string }) {
  const [tCommon, locale] = await Promise.all([getTranslations("Common"), getLocale()]);
  const { label, badgeClass } = getBalanceDisplay(
    client.balance,
    currencySymbol,
    toBcp47(locale as Language),
    tCommon
  );

  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{tCommon(`clientType_${client.type}`)}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}>{label}</span>
    </Link>
  );
}
