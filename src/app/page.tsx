import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AddClientButton } from "@/components/AddClientModal";
import { ClientCard } from "@/components/ClientCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isClientSortField, listClients, type ClientSortField } from "@/lib/clients";
import { getSettings } from "@/lib/settings";

interface HomePageProps {
  searchParams: Promise<{ search?: string; sortBy?: string; order?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const sortBy: ClientSortField = isClientSortField(params.sortBy ?? null)
    ? (params.sortBy as ClientSortField)
    : "lastActivity";
  const order = params.order === "asc" ? "asc" : "desc";

  const [clients, settings, t] = await Promise.all([
    listClients({ search, sortBy, order }),
    getSettings(),
    getTranslations("HomePage"),
  ]);

  const SORT_OPTIONS: { value: ClientSortField; label: string }[] = [
    { value: "lastActivity", label: t("sortByLastActivity") },
    { value: "balance", label: t("sortByBalance") },
    { value: "name", label: t("sortByName") },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <LanguageSwitcher language={settings.language} />
          <Link href="/reports/turnover" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            {t("reportLink")}
          </Link>
          <Link href="/settings" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            {t("settingsLink")}
          </Link>
          <AddClientButton />
        </div>
      </header>

      <form className="mb-6 flex flex-wrap gap-3" action="/" method="get">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          name="sortBy"
          defaultValue={sortBy}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="order"
          defaultValue={order}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="desc">{t("orderDesc")}</option>
          <option value="asc">{t("orderAsc")}</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          {t("apply")}
        </button>
      </form>

      {clients.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{search ? t("noResults") : t("noClients")}</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id}>
              <ClientCard client={client} currencySymbol={settings.currencySymbol} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
