import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db } from "./db";

// R15-SEC-A3: dummy hash precomputato per timing-equalize il path
// "user non esiste". Senza, `findUnique` + early return ~5ms vs
// findUnique + bcrypt compare ~150ms → attaccante enumera quali
// email sono admin misurando wall-clock della response login.
// Usiamo cost=10 come il nostro seed; il valore del password qui
// e' irrilevante — serve solo perche' bcrypt impieghi tempo simile.
const DUMMY_HASH_PROMISE = hash("dummy-timing-equalizer-password", 10);

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

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
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
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = typeof token.role === "string" ? token.role : "USER";
      }
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
