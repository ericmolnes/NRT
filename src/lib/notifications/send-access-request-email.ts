// Soft-fallback e-postsender for tilgangsforespørsler.
//
// Dette er den første e-postsenderen i kodebasen, og vi vil ikke at en
// halvferdig SMTP-konfig skal blokkere innloggingsflyten. Strategien er
// derfor "fail open" — alle feilstier returnerer { skipped: true } og
// logger til console.warn/error, men kaster ALDRI.
//
// **Avhengigheter:** `nodemailer` ligger ikke i package.json. Vi laster den
// dynamisk via `await import("nodemailer").catch(...)` slik at modulen er
// helt valgfri. Hvis SMTP-variablene ikke er satt — eller hvis pakken ikke
// er installert — hopper vi over uten støy. Når noen senere ønsker faktisk
// e-post-sending: legg til `nodemailer` i dependencies og sett env-vars.
//
// **Env-variabler som leses:**
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_TO_ADMIN
//
// Hvis NOEN av de seks mangler, returnerer vi { skipped: true }.

export type SendAccessRequestEmailInput = {
  userName: string;
  userEmail: string;
  /** Eksplisitt admin-e-post; ellers brukes SMTP_TO_ADMIN. */
  adminEmail?: string;
};

export type SendAccessRequestEmailResult = {
  skipped: boolean;
  messageId?: string;
  error?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  toAdmin: string;
};

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const toAdmin = process.env.SMTP_TO_ADMIN?.trim();

  if (!host || !portRaw || !user || !pass || !from || !toAdmin) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return { host, port, user, pass, from, toAdmin };
}

/**
 * Lavnivå-sender. Eksportert for testing slik at vi kan injisere en
 * mock-transport uten å gjøre dynamic-import-dansen i hver enkelt test.
 *
 * I produksjon kalles `sendAccessRequestEmail` som internt setter opp
 * nodemailer (hvis tilgjengelig).
 */
export type EmailTransport = {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ messageId?: string }>;
};

export async function sendAccessRequestEmailWithTransport(
  transport: EmailTransport | null,
  input: SendAccessRequestEmailInput,
  config: SmtpConfig | null
): Promise<SendAccessRequestEmailResult> {
  if (!config) {
    console.warn(
      "[notifications] SMTP not configured, skipping access-request email"
    );
    return { skipped: true };
  }

  if (!transport) {
    console.warn(
      "[notifications] nodemailer not installed, skipping access-request email"
    );
    return { skipped: true };
  }

  const adminEmail = input.adminEmail ?? config.toAdmin;
  const subject = `Ny tilgangsforespørsel fra ${input.userName}`;
  const text = [
    `${input.userName} (${input.userEmail}) har bedt om tilgang til NRT internal-tools.`,
    "",
    "Logg inn på /settings for å godkjenne eller avslå.",
  ].join("\n");

  try {
    const result = await transport.sendMail({
      from: config.from,
      to: adminEmail,
      subject,
      text,
    });
    return { skipped: false, messageId: result.messageId };
  } catch (err) {
    // Belt-and-suspenders: vi logger og returnerer skipped uten å rethrowe.
    // Innloggingsflyten må aldri knuses av en SMTP-feil.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notifications] access-request email failed:", message);
    return { skipped: true, error: message };
  }
}

/**
 * Produksjons-wrapperen. Leser SMTP-config fra env, prøver å laste
 * `nodemailer` dynamisk, og delegerer til `sendAccessRequestEmailWithTransport`.
 *
 * Returnerer `{ skipped: true }` hvis env mangler, hvis `nodemailer` ikke
 * er installert, eller hvis send-kallet feiler. Kaster ALDRI.
 */
export async function sendAccessRequestEmail(
  input: SendAccessRequestEmailInput
): Promise<SendAccessRequestEmailResult> {
  const config = readSmtpConfig();
  if (!config) {
    console.warn(
      "[notifications] SMTP not configured, skipping access-request email"
    );
    return { skipped: true };
  }

  // Dynamisk import slik at `nodemailer` forblir en valgfri avhengighet.
  // Hvis pakken ikke er installert returnerer vi null og hopper over.
  const nodemailerModule = (await import("nodemailer").catch(() => null)) as
    | {
        createTransport?: (opts: {
          host: string;
          port: number;
          secure?: boolean;
          auth: { user: string; pass: string };
        }) => EmailTransport;
        default?: {
          createTransport?: (opts: {
            host: string;
            port: number;
            secure?: boolean;
            auth: { user: string; pass: string };
          }) => EmailTransport;
        };
      }
    | null;

  // Både CJS- og ESM-form av nodemailer kan dukke opp avhengig av versjonen
  // og bundleren. Vi prøver begge.
  const createTransport =
    nodemailerModule?.createTransport ??
    nodemailerModule?.default?.createTransport ??
    null;

  if (!createTransport) {
    console.warn(
      "[notifications] nodemailer not installed, skipping access-request email"
    );
    return { skipped: true };
  }

  let transport: EmailTransport | null = null;
  try {
    transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[notifications] failed to create SMTP transport:",
      message
    );
    return { skipped: true, error: message };
  }

  return sendAccessRequestEmailWithTransport(transport, input, config);
}
