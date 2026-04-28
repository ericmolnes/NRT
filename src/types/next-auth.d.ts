import { DefaultSession } from "next-auth";

type AccessLevel = "MINIMUM" | "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      groups: string[];
      /**
       * Tilgangsnivå hentet fra UserAccess-tabellen, eller utledet via
       * bootstrap (ADMIN_EMAILS / ADMIN_GROUP_ID). `MINIMUM` betyr at
       * brukeren bare kan se /waiting-access.
       */
      accessLevel?: AccessLevel;
      /**
       * Id på UserAccess-raden hvis den finnes. Brukes til å referere
       * brukeren i endringsloggen og tilgangsforespørsler.
       */
      userAccessId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    groups?: string[];
  }
}
