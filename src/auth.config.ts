import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible NextAuth config.
 * Do NOT import Mongoose or any Node-only code here — this module runs in the
 * Edge runtime when used by `middleware.ts`.
 *
 * The Credentials provider (which needs DB access) is added in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    // Only enable Google when both env vars are present.
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/account");
      if (isProtected) return isLoggedIn;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub;
        token.role = (user as { role?: "user" | "admin" }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
        session.user.role =
          (token.role as "user" | "admin" | undefined) ?? "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
