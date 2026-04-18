import type { DefaultSession } from "next-auth";

/**
 * Module augmentation per tipizzare `user.role` e `session.user.role`.
 * Elimina la necessita' di `as any` in auth.ts e handler di route.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}

export {};
