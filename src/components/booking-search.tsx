"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

export function BookingSearch() {
  const t = useTranslations("hero");

  return (
    <div className="flex items-center bg-white rounded-full shadow-2xl overflow-hidden max-w-xl w-full">
      {/* Experience field */}
      <button
        type="button"
        className="flex-1 px-4 sm:px-6 py-4 border-r border-gray-200 text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <p className="text-xs font-semibold text-gray-800">
          {t("experienceLabel")}
        </p>
        <p className="text-sm text-gray-400 truncate">
          {t("experiencePlaceholder")}
        </p>
      </button>

      {/* Date field */}
      <button
        type="button"
        className="flex-1 px-4 sm:px-6 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <p className="text-xs font-semibold text-gray-800">{t("dateLabel")}</p>
        <p className="text-sm text-gray-400 truncate">
          {t("datePlaceholder")}
        </p>
      </button>

      {/* Search button */}
      <button
        type="button"
        className="w-12 h-12 m-2 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white hover:bg-[#0284c7] transition-colors cursor-pointer shrink-0"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
}
