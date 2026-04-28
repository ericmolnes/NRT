import NextAuth, { type NextAuthResult } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "./auth.config";
import { resolveAccessForSession } from "./access/get-current-access";

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

        // Robust mot DB-utfall: hvis Neon er midlertidig nede skal ikke hele
        // appen falle. Vi logger og degraderer til bootstrap/MINIMUM. Brukeren
        // får eventuelt /waiting-access, men auth() returnerer fortsatt en
        // gyldig sesjon.
        try {
          const access = await resolveAccessForSession({ entraId, email, groups });
          finalSession.user.accessLevel = access.level;
          finalSession.user.userAccessId = access.userAccessId;
        } catch (err) {
          console.error(
            "[auth.session] failed to load access:",
            err instanceof Error ? err.message : err
          );
          // Degradert modus: ren bootstrap-resolusjon uten DB-rad. Returnerer
          // ADMIN hvis bruker er i bootstrap-listen, ellers MINIMUM.
          const { resolveAccessLevel } = await import("./access/get-current-access");
          const bootstrapEmails = (process.env.ADMIN_EMAILS ?? "")
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
          const bootstrapGroupId = process.env.ADMIN_GROUP_ID?.trim() || null;
          const fallback = resolveAccessLevel({
            userAccessRow: null,
            email,
            groups,
            bootstrapEmails,
            bootstrapGroupId,
          });
          finalSession.user.accessLevel = fallback.level;
          finalSession.user.userAccessId = fallback.userAccessId;
        }
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
