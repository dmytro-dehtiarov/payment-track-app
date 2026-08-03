export type Language = "ru" | "en";

/** Maps the app's Settings.language value to a BCP-47 tag for Intl.*. */
export function toBcp47(language: Language): string {
  return language === "en" ? "en-US" : "ru-RU";
}

/**
 * The only place amountMinor is divided by 100 -- everywhere else in the app
 * (storage, balance math, API payloads) stays in minor units. See
 * Architecture.md ch.3 and the Phase 0 decision in the implementation plan.
 *
 * currencySymbol should come from Settings (see src/lib/settings.ts), and
 * locale should come from toBcp47(settings.language), wherever the caller
 * has access to them.
 */
export function formatMinorAmount(amountMinor: number, currencySymbol = "грн", locale = "ru-RU"): string {
  const major = amountMinor / 100;
  const formatted = major.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currencySymbol}`;
}

/**
 * `date`/`Invoice.date`/`Payment.date` are calendar days (Prisma DateTime
 * storing UTC midnight for a date-only value), not moments in time --
 * without pinning `timeZone: "UTC"` here, `toLocaleDateString` would convert
 * to the server/browser's local timezone and can roll the day back or
 * forward by one.
 */
export function formatDateOnly(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { timeZone: "UTC" });
}

/**
 * A date as a YYYY-MM-DD `<input type="date">` value, in the local calendar
 * day (server-side this is the host's timezone, which for a home-server
 * deployment is the user's own timezone). Deliberately not
 * `date.toISOString().slice(0,10)` -- that reads the UTC calendar day, which
 * is the wrong side of midnight for part of the day in any timezone behind UTC.
 */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateInputValue(): string {
  return toDateInputValue(new Date());
}

/** Inverse of formatMinorAmount's division -- the only place `* 100` happens. */
export function toMinorUnits(displayValue: string): number {
  const normalized = displayValue.trim().replace(",", ".");
  if (normalized === "") return NaN;
  const major = Number.parseFloat(normalized);
  if (!Number.isFinite(major)) return NaN;
  return Math.round(major * 100);
}
