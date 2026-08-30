"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { HistoryFeed } from "@/components/HistoryFeed";
import { QuickAddForm } from "@/components/QuickAddForm";
import { getBalanceDisplay } from "@/lib/balanceDisplay";
import type { ClientDetail } from "@/lib/clients";
import { toBcp47, type Language } from "@/lib/money";

type ClientType = ClientDetail["type"];

export function ClientDetailView({ client, currencySymbol }: { client: ClientDetail; currencySymbol: string }) {
  const t = useTranslations("ClientDetailView");
  const tCommon = useTranslations("Common");
  const locale = toBcp47(useLocale() as Language);
  const router = useRouter();
  const [editingClient, setEditingClient] = useState(false);
  const [name, setName] = useState(client.name);
  const [type, setType] = useState<ClientType>(client.type);
  const [contactInfo, setContactInfo] = useState(client.contactInfo ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [addingKind, setAddingKind] = useState<"invoice" | "payment" | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  function refresh() {
    router.refresh();
  }

  async function handleSaveClient(event: FormEvent) {
    event.preventDefault();
    setSavingClient(true);
    setClientError(null);

    const response = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        contactInfo: contactInfo.trim() || null,
        notes: notes.trim() || null,
      }),
    });

    setSavingClient(false);

    if (!response.ok) {
      setClientError(t("saveError"));
      return;
    }

    setEditingClient(false);
    refresh();
  }

  async function handleArchive() {
    const confirmed = window.confirm(t("archiveConfirm", { name: client.name }));
    if (!confirmed) return;

    const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (response.ok) refresh();
  }

  const { label, textClass } = getBalanceDisplay(client.balance, currencySymbol, locale, tCommon);

  const entries = [
    ...client.invoices.map((invoice) => ({ ...invoice, kind: "invoice" as const })),
    ...client.payments.map((payment) => ({ ...payment, kind: "payment" as const })),
  ];

  const filteredEntries = entries
    .filter((entry) => {
      const day = entry.date.toISOString().slice(0, 10);
      if (filterFrom && day < filterFrom) return false;
      if (filterTo && day > filterTo) return false;
      return true;
    })
    .sort((a, b) => (sortOrder === "desc" ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()));

  const hasFilter = filterFrom !== "" || filterTo !== "";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-gray-500 hover:underline dark:text-gray-400">
        {tCommon("backToClients")}
      </Link>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        {editingClient ? (
          <form onSubmit={handleSaveClient} className="space-y-3">
            {clientError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                {clientError}
              </p>
            )}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ClientType)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="person">{tCommon("clientType_person")}</option>
              <option value="kindergarten">{tCommon("clientType_kindergarten")}</option>
              <option value="school">{tCommon("clientType_school")}</option>
            </select>
            <input
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
              placeholder={t("contactPlaceholder")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingClient}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
              >
                {savingClient ? t("saving") : t("save")}
              </button>
              <button
                type="button"
                onClick={() => setEditingClient(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {tCommon("cancel")}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-gray-900 dark:text-gray-100">{client.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tCommon(`clientType_${client.type}`)}</p>
                {client.contactInfo && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{client.contactInfo}</p>
                )}
                {client.notes && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{client.notes}</p>}
                {client.archived && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">{t("archived")}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(true)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t("edit")}
                </button>
                {!client.archived && (
                  <button
                    type="button"
                    onClick={handleArchive}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t("archive")}
                  </button>
                )}
              </div>
            </div>
            <p className={`mt-4 text-2xl font-semibold ${textClass}`}>{label}</p>
          </>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAddingKind(addingKind === "invoice" ? null : "invoice")}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          {t("addInvoice")}
        </button>
        <button
          type="button"
          onClick={() => setAddingKind(addingKind === "payment" ? null : "payment")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t("addPayment")}
        </button>
      </div>

      {addingKind && (
        <div className="mb-6">
          <QuickAddForm
            clientId={client.id}
            kind={addingKind}
            onDone={() => {
              setAddingKind(null);
              refresh();
            }}
            onCancel={() => setAddingKind(null)}
          />
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{t("history")}</h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t("filterFrom")}</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(event) => setFilterFrom(event.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t("filterTo")}</label>
          <input
            type="date"
            value={filterTo}
            onChange={(event) => setFilterTo(event.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t("sortOrder")}</label>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "desc" | "asc")}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="desc">{t("sortNewestFirst")}</option>
            <option value="asc">{t("sortOldestFirst")}</option>
          </select>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setFilterFrom("");
              setFilterTo("");
            }}
            className="text-sm text-gray-600 hover:underline dark:text-gray-400"
          >
            {t("clearFilter")}
          </button>
        )}
      </div>

      {hasFilter && filteredEntries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("noFilterResults")}</p>
      ) : (
        <HistoryFeed entries={filteredEntries} currencySymbol={currencySymbol} onChanged={refresh} />
      )}
    </div>
  );
}
