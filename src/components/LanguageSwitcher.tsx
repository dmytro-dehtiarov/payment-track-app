"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Language = "ru" | "en";

export function LanguageSwitcher({ language }: { language: Language }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function setLanguage(lang: Language) {
    if (lang === language || pending) return;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => setLanguage("ru")}
        disabled={pending}
        className={
          language === "ru"
            ? "font-semibold text-gray-900 dark:text-gray-100"
            : "text-gray-400 hover:underline dark:text-gray-500"
        }
      >
        RU
      </button>
      <span className="text-gray-300 dark:text-gray-600">/</span>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        disabled={pending}
        className={
          language === "en"
            ? "font-semibold text-gray-900 dark:text-gray-100"
            : "text-gray-400 hover:underline dark:text-gray-500"
        }
      >
        EN
      </button>
    </div>
  );
}
