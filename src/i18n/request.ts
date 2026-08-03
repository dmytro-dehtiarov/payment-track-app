import { getRequestConfig } from "next-intl/server";
import { getSettings } from "@/lib/settings";

// No URL-based i18n routing (Architecture.md ch.7): the language is a
// Settings value, not a [locale] route segment, so it's resolved from the DB
// rather than from `requestLocale`.
export default getRequestConfig(async () => {
  const settings = await getSettings();
  const locale = settings.language;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
