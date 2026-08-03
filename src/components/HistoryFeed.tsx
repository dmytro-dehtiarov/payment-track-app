"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { formatDateOnly, formatMinorAmount, toBcp47, toMinorUnits, type Language } from "@/lib/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/paymentMethod";

export interface HistoryEntry {
  id: string;
  kind: "invoice" | "payment";
  date: Date;
  amountMinor: number;
  description: string | null;
  method?: PaymentMethod;
  methodDetail?: string | null;
}

export function HistoryFeed({
  entries,
  currencySymbol,
  onChanged,
}: {
  entries: HistoryEntry[];
  currencySymbol: string;
  onChanged: () => void;
}) {
  const t = useTranslations("HistoryFeed");

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("noEntries")}</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <HistoryRow key={`${entry.kind}-${entry.id}`} entry={entry} currencySymbol={currencySymbol} onChanged={onChanged} />
      ))}
    </ul>
  );
}

function HistoryRow({
  entry,
  currencySymbol,
  onChanged,
}: {
  entry: HistoryEntry;
  currencySymbol: string;
  onChanged: () => void;
}) {
  const t = useTranslations("HistoryFeed");
  const tCommon = useTranslations("Common");
  const locale = toBcp47(useLocale() as Language);

  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.date.toISOString().slice(0, 10));
  const [amount, setAmount] = useState(String(entry.amountMinor / 100));
  const [description, setDescription] = useState(entry.description ?? "");
  const [method, setMethod] = useState<PaymentMethod | null>(entry.method ?? null);
  const [methodDetail, setMethodDetail] = useState(entry.methodDetail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiPath = entry.kind === "invoice" ? "invoices" : "payments";

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    const amountMinor = toMinorUnits(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t("invalidAmount"));
      return;
    }

    if (entry.kind === "payment" && !method) {
      setError(tCommon("methodRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      date,
      amountMinor,
      description: description.trim() || null,
    };
    if (entry.kind === "payment") {
      body.method = method;
      body.methodDetail = methodDetail.trim() || null;
    }

    const response = await fetch(`/api/${apiPath}/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    setEditing(false);
    onChanged();
  }

  async function handleDelete() {
    const confirmed = window.confirm(t("deleteConfirm"));
    if (!confirmed) return;

    const response = await fetch(`/api/${apiPath}/${entry.id}`, { method: "DELETE" });
    if (response.ok) onChanged();
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSave} className="space-y-3">
          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400">{t("date")}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400">{t("amount")}</label>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400">{t("description")}</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {entry.kind === "payment" && (
            <div className="space-y-2">
              <span className="block text-xs text-gray-500 dark:text-gray-400">{tCommon("method")}</span>
              <div className="flex flex-wrap gap-4">
                {PAYMENT_METHODS.map((option) => (
                  <label key={option} className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100">
                    <input
                      type="radio"
                      name={`payment-method-${entry.id}`}
                      required
                      checked={method === option}
                      onChange={() => setMethod(option)}
                      className="h-4 w-4"
                    />
                    {tCommon(`method_${option}`)}
                  </label>
                ))}
              </div>
              {method === "card" && (
                <input
                  value={methodDetail}
                  onChange={(event) => setMethodDetail(event.target.value)}
                  placeholder={tCommon("methodDetailPlaceholder")}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
            >
              {submitting ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            entry.kind === "invoice"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          }`}
        >
          {entry.kind === "invoice" ? t("invoice") : t("payment")}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatMinorAmount(entry.amountMinor, currencySymbol, locale)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateOnly(entry.date, locale)}
            {entry.method ? ` · ${tCommon(`method_${entry.method}`)}` : ""}
            {entry.methodDetail ? ` (${entry.methodDetail})` : ""}
            {entry.description ? ` · ${entry.description}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-gray-600 hover:underline dark:text-gray-400">
          {t("edit")}
        </button>
        <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:underline dark:text-red-400">
          {t("delete")}
        </button>
      </div>
    </li>
  );
}
