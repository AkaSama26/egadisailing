"use client";

export function CookiePreferencesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-cc="show-preferencesModal"
      className="transition-colors hover:text-white"
    >
      {label}
    </button>
  );
}
