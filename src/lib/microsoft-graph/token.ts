import { auth } from "@/lib/auth";

/**
 * Get the Microsoft Graph access token from the current session.
 * The token is stored in the JWT during the OAuth flow.
 */
export async function getGraphAccessToken(): Promise<string> {
  const session = await auth();
  const token = (session as unknown as Record<string, unknown>)?.accessToken as string | undefined;

  if (!token) {
    throw new Error(
      "Ingen Microsoft Graph access token tilgjengelig. " +
      "Sørg for at Graph API-scopes er konfigurert og brukeren er logget inn på nytt."
    );
  }

  return token;
}
