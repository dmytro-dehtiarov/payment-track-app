"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { todayDateInputValue, toMinorUnits } from "@/lib/money";

interface QuickAddFormProps {
  clientId: string;
  kind: "invoice" | "payment";
  onDone: () => void;
  onCancel: () => void;
}

export function QuickAddForm({ clientId, kind, onDone, onCancel }: QuickAddFormProps) {
  const t = useTranslations("QuickAddForm");
  const tCommon = useTranslations("Common");
  const [date, setDate] = useState(todayDateInputValue);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const amountMinor = toMinorUnits(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t("invalidAmount"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const path = kind === "invoice" ? "invoices" : "payments";
    const response = await fetch(`/api/clients/${clientId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amountMinor, description: description.trim() || undefined }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {kind === "invoice" ? t("addInvoiceTitle") : t("addPaymentTitle")}
      </h3>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
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
            placeholder="0.00"
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
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
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
  );
}
