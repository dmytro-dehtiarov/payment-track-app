"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { AppSettings } from "@/lib/settings";

type Theme = AppSettings["theme"];
type Language = AppSettings["language"];

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const t = useTranslations("SettingsForm");
  const router = useRouter();

  const [theme, setTheme] = useState<Theme>(settings.theme);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [language, setLanguage] = useState<Language>(settings.language);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  async function handleSaveSettings(event: FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSaved(false);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, currencySymbol, language }),
    });

    setSavingSettings(false);

    if (!response.ok) {
      setSettingsError(t("saveError"));
      return;
    }

    setSettingsSaved(true);
    router.refresh();
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordChanged(false);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setChangingPassword(false);

    if (!response.ok) {
      setPasswordError(t("passwordChangeError"));
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setPasswordChanged(true);
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSaveSettings}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("appearanceTitle")}</h2>
        {settingsError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {settingsError}
          </p>
        )}
        {settingsSaved && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
            {t("saved")}
          </p>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("theme")}</label>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as Theme)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="light">{t("themeLight")}</option>
            <option value="dark">{t("themeDark")}</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("currencySymbol")}</label>
          <input
            value={currencySymbol}
            onChange={(event) => setCurrencySymbol(event.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("language")}</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="ru">{t("languageRu")}</option>
            <option value="en">{t("languageEn")}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={savingSettings}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {savingSettings ? t("saving") : t("save")}
        </button>
      </form>

      <form
        onSubmit={handleChangePassword}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("changePasswordTitle")}</h2>
        {passwordError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {passwordError}
          </p>
        )}
        {passwordChanged && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
            {t("passwordChanged")}
          </p>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("currentPassword")}</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("newPassword")}</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={changingPassword}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {changingPassword ? t("changingPassword") : t("changePassword")}
        </button>
      </form>
    </div>
  );
}
