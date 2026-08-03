import { formatMinorAmount } from "@/lib/money";

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Shared between ClientCard (badge style) and ClientDetailView (plain text)
 * so the red/green/gray balance-status rule (Architecture.md ch.4.1) only
 * lives in one place.
 */
export function getBalanceDisplay(balance: number, currencySymbol: string, locale: string, t: Translator) {
  if (balance > 0) {
    return {
      label: t("balance_owesMe", { amount: formatMinorAmount(balance, currencySymbol, locale) }),
      textClass: "text-red-700 dark:text-red-400",
      badgeClass: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    };
  }
  if (balance < 0) {
    return {
      label: t("balance_overpaid", { amount: formatMinorAmount(Math.abs(balance), currencySymbol, locale) }),
      textClass: "text-green-700 dark:text-green-400",
      badgeClass: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    };
  }
  return {
    label: t("balance_settled"),
    textClass: "text-gray-600 dark:text-gray-400",
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
}
