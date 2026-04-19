import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db } from "./db";
import { enforceRateLimit } from "./rate-limit/service";
import { RATE_LIMIT_SCOPES } from "./channels";
import { headers } from "next/headers";
import { logger } from "./logger";

// R15-SEC-A3: dummy hash precomputato per timing-equalize il path
// "user non esiste". Senza, `findUnique` + early return ~5ms vs
// findUnique + bcrypt compare ~150ms → attaccante enumera quali
// email sono admin misurando wall-clock della response login.
// Usiamo cost=10 come il nostro seed; il valore del password qui
// e' irrilevante — serve solo perche' bcrypt impieghi tempo simile.
// R17-REG-A1: fallback deve essere hash VALIDO (formato bcrypt corretto con
// salt+hash reali), altrimenti `compare` puo' throw "Invalid salt version"
// invece di ritornare false. Valore precomputato offline via `bcrypt.hash("x", 10)`
// → guaranteed-no-match per qualsiasi password reale (nessuno usa "x").
const VALID_DUMMY_FALLBACK = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8N5rnk8J5oeKqyRwPLaP5K8jqKJhc.";
const DUMMY_HASH_PROMISE = hash("dummy-timing-equalizer-password", 10).catch(
  () => VALID_DUMMY_FALLBACK,
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // R17-SEC-#13: rate-limit login admin per IP + per email. Senza,
        // bcrypt compare ~150ms = 400 tentativi/min/thread → brute-force
        // password admin in giorni. 10/15min IP + 5/hour email limita
        // senza bloccare admin legittimo.
        const email = String(credentials.email).toLowerCase().trim();
        try {
          const h = await headers();
          const ip =
            h.get("cf-connecting-ip") ??
            h.get("x-real-ip") ??
            h.get("x-forwarded-for")?.split(",")[0].trim() ??
            "unknown";
          await enforceRateLimit({
            identifier: ip,
            scope: RATE_LIMIT_SCOPES.ADMIN_LOGIN_IP,
            limit: 10,
            windowSeconds: 900,
            failOpen: false, // R17-SEC-#5: no brute-force bypass su Redis down
          });
          await enforceRateLimit({
            identifier: email,
            scope: RATE_LIMIT_SCOPES.ADMIN_LOGIN_EMAIL,
            limit: 5,
            windowSeconds: 3600,
            failOpen: false,
          });
        } catch (err) {
          logger.warn(
            { err: (err as Error).message },
            "Admin login rate-limit hit",
          );
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        // R15-SEC-A3: eseguiamo SEMPRE bcrypt compare, anche quando user
        // non esiste, per evitare user enumeration timing attack.
        const hashToCheck = user?.passwordHash ?? (await DUMMY_HASH_PROMISE);
        const isValid = await compare(credentials.password as string, hashToCheck);

        if (!user || !isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.sub) return session;

      // R17-SEC-#2 CRITICA: verifica che l'utente esista ANCORA nel DB
      // e ri-derive il role FRESCO. Senza questo lookup:
      //  - AUTH_SECRET leak → attacker forgia JWT {role:"ADMIN"} offline,
      //    setta cookie, bypassa middleware (che verifica solo firma+role).
      //  - User declassato (ADMIN→USER) nel DB mantiene ADMIN nel JWT
      //    fino a expiry 8h → nessuna revoca possibile.
      // Costo: 1 DB round-trip/request admin (~5ms con PK index).
      const dbUser = await db.user
        .findUnique({
          where: { id: token.sub },
          select: { id: true, email: true, name: true, role: true },
        })
        .catch(() => null);
      if (!dbUser) {
        // Session stale/compromessa → forza re-login (invalida nel middleware).
        // Cast via unknown: NextAuth type `user` e' non-nullable ma
        // accettiamo deviazione per segnalare invalidazione.
        return { ...session, user: undefined } as unknown as typeof session;
      }

      session.user.id = dbUser.id;
      session.user.email = dbUser.email;
      session.user.name = dbUser.name;
      session.user.role = dbUser.role;
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    // Round 10 Sec-A3: session admin 8h (giornata lavorativa) invece del
    // default NextAuth 30gg. Se il JWT viene rubato (XSS third-party, device
    // perso), l'attacker ha finestra limitata. `updateAge` rolla la session
    // se l'admin usa la dashboard ogni ora.
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
});
