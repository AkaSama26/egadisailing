"use client";

import { logout } from "./actions";

export function LogoutButton({ label = "Esci" }: { label?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-white/80 hover:text-white text-sm underline underline-offset-4"
      >
        {label}
      </button>
    </form>
  );
}
