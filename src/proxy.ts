import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Next.js 16 renamed `middleware` to `proxy`. The exported function must be
// literally named `proxy` (or be the default export) for Next to detect it.
export default auth;

export const config = {
  // Run on everything except Next internals, static assets, and the NextAuth
  // API routes (which must remain accessible to unauthenticated users).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$).*)",
  ],
};
