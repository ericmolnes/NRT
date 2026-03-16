import { getPowerOfficeConfig } from "./config";
import { PowerOfficeError } from "./errors";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

const SAFETY_MARGIN_MS = 60_000; // Hent nytt token 1 minutt før utløp

export async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - SAFETY_MARGIN_MS) {
    return tokenCache.accessToken;
  }

  const config = getPowerOfficeConfig();
  const credentials = btoa(`${config.applicationKey}:${config.clientKey}`);

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new PowerOfficeError(
      `Kunne ikke hente token: ${text}`,
      response.status,
      "TOKEN_ERROR"
    );
  }

  const data = await response.json();
  const expiresInMs = (data.expires_in ?? 1200) * 1000;

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresInMs,
  };

  return tokenCache.accessToken;
}

/** Fjern cached token (brukes ved 401-retry) */
export function clearTokenCache(): void {
  tokenCache = null;
}
