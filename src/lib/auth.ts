import NextAuth, { type NextAuthResult } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { resolveAccessLevel } from "./access/get-current-access";

// Vi utvider auth.config sin session-callback med et DB-oppslag som beriker
// `session.user` med `accessLevel` og `userAccessId`. Dette gjøres her
// (server-only) og ikke i auth.config.ts, slik at middleware ikke trekker
// Prisma-klienten inn i edge-bundlen.
const nextAuth: NextAuthResult = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      // Kjør den eksisterende session-callbacken først (id, groups, accessToken).
      const baseSession = authConfig.callbacks?.session
        ? await authConfig.callbacks.session({ session, token } as Parameters<
            NonNullable<NonNullable<typeof authConfig.callbacks>["session"]>
          >[0])
        : session;

      const finalSession = baseSession as typeof session;

      if (finalSession.user) {
        const entraId = finalSession.user.id ?? null;
        const email = finalSession.user.email ?? null;
        const groups = finalSession.user.groups ?? [];

        // Slå opp UserAccess-raden. Vi kjører dette på hver session-henting
        // for nå. Det er enkelt og korrekt — admin-godkjenning slår igjennom
        // umiddelbart. Hvis dette blir for tungt kan vi flytte til JWT-cache
        // og invalidasjonsmekanisme.
        let row: { id: string; level: "MINIMUM" | "USER" | "ADMIN" } | null = null;
        if (entraId || email) {
          const orFilters: Array<{ entraId?: string; email?: string }> = [];
          if (entraId) orFilters.push({ entraId });
          if (email) orFilters.push({ email });
          row = await db.userAccess.findFirst({
            where: { OR: orFilters },
            select: { id: true, level: true },
          });
        }

        const bootstrapEmails = (process.env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const bootstrapGroupId = process.env.ADMIN_GROUP_ID?.trim() || null;

        const access = resolveAccessLevel({
          userAccessRow: row,
          email,
          groups,
          bootstrapEmails,
          bootstrapGroupId,
        });

        finalSession.user.accessLevel = access.level;
        finalSession.user.userAccessId = access.userAccessId;
      }

      return finalSession;
    },
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: {
          scope: "openid profile email User.Read Files.ReadWrite.All Sites.Read.All",
        },
      },
    }),
  ],
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
