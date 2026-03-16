import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extract a string value from FormData.
 * Returns empty string if the key is missing or the value is not a string.
 */
export function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Safely extract an optional string value from FormData.
 * Returns undefined if the key is missing, empty, or not a string.
 */
export function getFormStringOptional(
  formData: FormData,
  key: string
): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string" || value === "") return undefined;
  return value;
}
