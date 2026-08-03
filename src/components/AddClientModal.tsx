"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type ClientType = "person" | "fop" | "company";

export function AddClientButton() {
  const t = useTranslations("AddClientModal");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ClientType>("person");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("error"));
      return;
    }

    setName("");
    setType("person");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
      >
        {t("addClient")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="space-y-1">
                <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("name")}
                </label>
                <input
                  id="client-name"
                  required
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="client-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("type")}
                </label>
                <select
                  id="client-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as ClientType)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="person">{tCommon("clientType_person")}</option>
                  <option value="fop">{tCommon("clientType_fop")}</option>
                  <option value="company">{tCommon("clientType_company")}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
                >
                  {submitting ? t("adding") : t("add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
