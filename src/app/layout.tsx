import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Debt Tracker",
  description: "Трекинг должников и переплат по клиентам",
};

// Every page reads live data from SQLite (clients, balances, Settings) --
// nothing in this app should be statically cached at build time, or a
// production build would freeze e.g. Settings at whatever they were during
// `next build` and never reflect later changes.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  return (
    <html
      lang={settings.language}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${settings.theme === "dark" ? "dark" : ""}`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
