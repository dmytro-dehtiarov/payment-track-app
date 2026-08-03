import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMinorAmount, toBcp47, toDateInputValue, type Language } from "@/lib/money";
import { getTurnoverReport } from "@/lib/report";
import { getSettings } from "@/lib/settings";

interface ReportPageProps {
  searchParams: Promise<{ from?: string; to?: string; clientId?: string }>;
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = await searchParams;
  const now = new Date();
  const from = params.from ?? toDateInputValue(firstOfMonth(now));
  const to = params.to ?? toDateInputValue(now);
  const clientId = params.clientId ?? "";

  const [t, tCommon, settings, allClients, report] = await Promise.all([
    getTranslations("ReportPage"),
    getTranslations("Common"),
    getSettings(),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getTurnoverReport({ from: new Date(from), to: new Date(to), clientId: clientId || undefined }),
  ]);

  const locale = toBcp47(settings.language as Language);
  const fmt = (amountMinor: number) => formatMinorAmount(amountMinor, settings.currencySymbol, locale);

  const exportParams = new URLSearchParams({ from, to, ...(clientId ? { clientId } : {}) });

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-gray-500 hover:underline dark:text-gray-400">
        {tCommon("backToClients")}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h1>

      <form className="mb-6 flex flex-wrap items-end gap-3" action="/reports/turnover" method="get">
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t("from")}</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t("to")}</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t("client")}</label>
          <select
            name="clientId"
            defaultValue={clientId}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">{t("allClients")}</option>
            {allClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          {t("apply")}
        </button>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile label={t("balanceAtStart")} value={fmt(report.balanceAtStart)} />
        <SummaryTile label={t("totalInvoiced")} value={fmt(report.totalInvoiced)} />
        <SummaryTile label={t("totalPaid")} value={fmt(report.totalPaid)} />
        <SummaryTile label={t("netChange")} value={fmt(report.netChange)} />
        <SummaryTile label={t("balanceAtEnd")} value={fmt(report.balanceAtEnd)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <a
          href={`/api/reports/turnover/export?${exportParams.toString()}&format=csv`}
          className="text-sm text-gray-600 hover:underline dark:text-gray-400"
        >
          {t("exportCsv")}
        </a>
        <a
          href={`/api/reports/turnover/export?${exportParams.toString()}&format=xlsx`}
          className="text-sm text-gray-600 hover:underline dark:text-gray-400"
        >
          {t("exportXlsx")}
        </a>
      </div>

      {report.clients.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("noData")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{t("client")}</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                  {t("balanceAtStart")}
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                  {t("totalInvoiced")}
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">{t("totalPaid")}</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">{t("netChange")}</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                  {t("balanceAtEnd")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {report.clients.map((row) => (
                <tr key={row.clientId}>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.clientName}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(row.balanceAtStart)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(row.totalInvoiced)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(row.totalPaid)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(row.netChange)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(row.balanceAtEnd)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{t("total")}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{fmt(report.balanceAtStart)}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{fmt(report.totalInvoiced)}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{fmt(report.totalPaid)}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{fmt(report.netChange)}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{fmt(report.balanceAtEnd)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
