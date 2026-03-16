import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnPublicPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/s/");

      if (isOnPublicPage) {
        if (isLoggedIn && nextUrl.pathname.startsWith("/login"))
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.id = profile.sub;
        token.groups =
          (profile as Record<string, unknown>).groups as string[] ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.groups = (token.groups as string[]) ?? [];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
