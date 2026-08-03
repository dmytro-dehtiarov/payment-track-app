import { cache } from "react";
import { prisma } from "@/lib/db";

export interface AppSettings {
  id: string;
  theme: "light" | "dark";
  currencySymbol: string;
  language: "ru" | "en";
  updatedAt: Date;
}

/**
 * Deduped per request via React's cache() -- Server Components (layout +
 * page) each call this, but it only hits SQLite once per render pass.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    throw new Error("Settings row not found -- run `npx prisma db seed` first.");
  }
  return {
    id: settings.id,
    theme: settings.theme,
    currencySymbol: settings.currencySymbol,
    language: settings.language,
    updatedAt: settings.updatedAt,
  };
});
