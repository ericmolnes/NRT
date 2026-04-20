import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.POWEROFFICE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "POWEROFFICE_ENCRYPTION_KEY mangler eller er ugyldig. Generer med: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Krypterer en plaintext-streng med AES-256-GCM.
 * Returnerer base64-kodet streng: iv (12 byte) + tag (16 byte) + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv + tag + ciphertext, alt i én base64-streng
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Dekrypterer en base64-kodet streng produsert av encrypt().
 */
export function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encoded, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
