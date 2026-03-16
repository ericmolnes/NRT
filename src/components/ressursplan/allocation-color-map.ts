/** Dynamisk label-type som kommer fra databasen */
export interface LabelDef {
  id: string;
  name: string;
  color: string;     // hex "#22c55e"
  textColor: string;  // hex "#ffffff"
  category: string;   // "client" | "status" | "internal"
  sortOrder: number;
}

/** Bygg et fargekart fra database-labels */
export function buildColorMap(labels: LabelDef[]): Map<string, LabelDef> {
  const map = new Map<string, LabelDef>();
  for (const label of labels) {
    map.set(label.name, label);
  }
  return map;
}

/** Fallback for labels som ikke finnes i kartet */
const FALLBACK: LabelDef = {
  id: "",
  name: "?",
  color: "#9ca3af",
  textColor: "#ffffff",
  category: "client",
  sortOrder: 999,
};

export function getLabelStyle(labelName: string, colorMap: Map<string, LabelDef>): LabelDef {
  return colorMap.get(labelName) ?? { ...FALLBACK, name: labelName };
}
