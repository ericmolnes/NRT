const ENDPOINTS = {
  demo: {
    tokenUrl: "https://goapi.poweroffice.net/Demo/OAuth/Token",
    apiBaseUrl: "https://goapi.poweroffice.net/Demo/v2",
  },
  production: {
    tokenUrl: "https://goapi.poweroffice.net/OAuth/Token",
    apiBaseUrl: "https://goapi.poweroffice.net/v2",
  },
} as const;

export type PowerOfficeEnv = keyof typeof ENDPOINTS;

export interface PowerOfficeConfig {
  applicationKey: string;
  clientKey: string;
  subscriptionKey: string;
  env: PowerOfficeEnv;
  tokenUrl: string;
  apiBaseUrl: string;
}

export function getPowerOfficeConfig(): PowerOfficeConfig {
  const applicationKey = process.env.POWEROFFICE_APPLICATION_KEY;
  const clientKey = process.env.POWEROFFICE_CLIENT_KEY;
  const subscriptionKey = process.env.POWEROFFICE_SUBSCRIPTION_KEY;
  const env = (process.env.POWEROFFICE_ENV ?? "demo") as PowerOfficeEnv;

  if (!applicationKey || !clientKey || !subscriptionKey) {
    throw new Error(
      "Mangler PowerOffice-konfigurasjon. Sett POWEROFFICE_APPLICATION_KEY, POWEROFFICE_CLIENT_KEY og POWEROFFICE_SUBSCRIPTION_KEY."
    );
  }

  if (env !== "demo" && env !== "production") {
    throw new Error(
      `Ugyldig POWEROFFICE_ENV: "${env}". Bruk "demo" eller "production".`
    );
  }

  return {
    applicationKey,
    clientKey,
    subscriptionKey,
    env,
    ...ENDPOINTS[env],
  };
}
