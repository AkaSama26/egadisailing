"use client";

import { logout } from "./actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-white/80 hover:text-white text-sm underline underline-offset-4"
      >
        Esci
      </button>
    </form>
  );
}
