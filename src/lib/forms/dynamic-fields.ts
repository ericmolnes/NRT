export type DynamicFieldDefinition = {
  id: string;
  name: string;
  type: string;
  options: string | null;
  required: boolean;
};

export function getDynamicFieldValue(
  formData: FormData,
  field: DynamicFieldDefinition
): string {
  const rawValue = formData.get(`field_${field.id}`);

  if (field.type === "BOOLEAN") {
    return rawValue === "true" ? "true" : "false";
  }

  return typeof rawValue === "string" ? rawValue : "";
}

export function validateDynamicFieldValue(
  field: DynamicFieldDefinition,
  value: string
): string | null {
  if (field.required && field.type !== "BOOLEAN" && !value.trim()) {
    return `${field.name} er påkrevd`;
  }

  if (!value && field.type !== "BOOLEAN") return null;

  switch (field.type) {
    case "NUMBER":
      return Number.isNaN(Number(value)) ? `${field.name} må være et tall` : null;
    case "DATE":
      return Number.isNaN(Date.parse(value))
        ? `${field.name} må være en gyldig dato`
        : null;
    case "SELECT": {
      const allowed = field.options?.split(",").map((option) => option.trim());
      return allowed && !allowed.includes(value)
        ? `${field.name} har en ugyldig verdi`
        : null;
    }
    case "BOOLEAN":
      return value !== "true" && value !== "false"
        ? `${field.name} må være true eller false`
        : null;
    default:
      return null;
  }
}

export function shouldPersistDynamicFieldValue(
  field: DynamicFieldDefinition,
  value: string
): boolean {
  return field.type === "BOOLEAN" || value.length > 0;
}
