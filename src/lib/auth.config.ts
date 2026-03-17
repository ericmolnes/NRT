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
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.groups = (token.groups as string[]) ?? [];
      }
      // Expose access token for Graph API
      (session as unknown as Record<string, unknown>).accessToken = token.accessToken;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
