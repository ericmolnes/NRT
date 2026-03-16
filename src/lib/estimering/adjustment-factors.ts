export const ADJUSTMENT_FACTORS = [
  {
    value: 0.5,
    label: "Meget god tilkomst",
    description:
      "Fritt tilgjengelig, god plass, ingen hindringer. Parallell installasjon mulig.",
    color: "text-green-700",
  },
  {
    value: 0.7,
    label: "God tilkomst",
    description:
      "Lett tilgjengelig, noe utstyr i veien men enkelt a jobbe rundt.",
    color: "text-green-600",
  },
  {
    value: 1.0,
    label: "Normal",
    description: "Standard arbeidsforhold, typisk industriinstallasjon.",
    color: "text-foreground",
  },
  {
    value: 1.3,
    label: "Noe begrenset",
    description:
      "Trange forhold, noe demontering nodvendig, begrenset verktoybruk.",
    color: "text-amber-600",
  },
  {
    value: 1.5,
    label: "Darlig tilkomst",
    description:
      "Vanskelig tilgang, stillaser kreves, trange rom, arbeid i hoyde.",
    color: "text-orange-600",
  },
  {
    value: 2.0,
    label: "Meget darlig tilkomst",
    description:
      "Konfinerert rom, svart begrenset plass, spesielle sikkerhetstiltak pakreves.",
    color: "text-red-600",
  },
] as const;

export type AdjustmentFactorValue = (typeof ADJUSTMENT_FACTORS)[number]["value"];

export function getAdjustmentLabel(value: number): string {
  const factor = ADJUSTMENT_FACTORS.find((f) => f.value === value);
  return factor?.label || `${value}x`;
}

export function getAdjustmentColor(value: number): string {
  if (value <= 0.5) return "text-green-700";
  if (value <= 0.7) return "text-green-600";
  if (value <= 1.0) return "text-foreground";
  if (value <= 1.3) return "text-amber-600";
  if (value <= 1.5) return "text-orange-600";
  return "text-red-600";
}
