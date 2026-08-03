import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const [settings, t, tCommon] = await Promise.all([
    getSettings(),
    getTranslations("SettingsPage"),
    getTranslations("Common"),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-gray-500 hover:underline dark:text-gray-400">
        {tCommon("backToClients")}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
