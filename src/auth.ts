import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { NextResponse } from "next/server";
import { loginRateLimitKey, verifyPassword } from "@/lib/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Self-hosted on a home mini-PC / LAN, not a multi-tenant SaaS behind
  // arbitrary Host headers -- Auth.js's UntrustedHost guard (production-only,
  // absent in `next dev`) would otherwise 500 every request.
  trustHost: true,
  cookies: {
    sessionToken: {
      options: {
        sameSite: "strict",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials, request) {
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        const ok = await verifyPassword(password, loginRateLimitKey(request));
        return ok ? { id: "admin", name: "Admin" } : null;
      },
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/api/auth") || pathname === "/login") {
        return true;
      }

      if (pathname.startsWith("/api")) {
        return auth?.user ? true : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return Boolean(auth?.user);
    },
  },
});
