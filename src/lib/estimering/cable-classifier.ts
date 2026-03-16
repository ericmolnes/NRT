/**
 * Klassifiserer kabelstorrelse fra kabeltype-streng.
 *
 * Eksempler:
 *  "BFOU 1x2x0.75"    -> 0.75mm2 -> "< 6mm2"
 *  "PFSP 3x2.5"       -> 2.5mm2  -> "< 6mm2"
 *  "TFXP 4x16"        -> 16mm2   -> "6-50mm2"
 *  "PFSP 3x95"        -> 95mm2   -> "> 50mm2"
 *  "EMC 3X50+3G10"    -> 50mm2   -> "6-50mm2"
 */
export function classifyCableSize(cableType: string): string {
  // Mønster 1: "NxMxS" eller "NxS" der S er tverrsnittet
  // f.eks. "1x2x0.75", "3x2.5", "4x16+3G10"
  const patterns = [
    // "3X50+3G10" -> ta storste verdi for hovedleder (50)
    /(\d+)[xX](\d+(?:\.\d+)?)\+/,
    // "1x2x0.75" -> siste tall
    /(\d+)[xX](\d+)[xX](\d+(?:\.\d+)?)/,
    // "3x2.5" -> siste tall
    /(\d+)[xX](\d+(?:\.\d+)?)\s*(?:mm2)?$/,
    // frittstaaende "mm2" etter tall: "2.5mm2"
    /(\d+(?:\.\d+)?)\s*mm2/i,
  ];

  for (const pattern of patterns) {
    const match = cableType.match(pattern);
    if (match) {
      // Ta det siste fanget tallet (som er tverrsnittet)
      const sizeStr = match[match.length - 1];
      const size = parseFloat(sizeStr);
      if (!isNaN(size)) {
        if (size < 6) return "< 6mm2";
        if (size <= 50) return "6-50mm2";
        return "> 50mm2";
      }
    }
  }

  // Fallback
  return "< 6mm2";
}

/**
 * Mapper utstyrstype til norm-kategorinavn for oppslag.
 */
export function equipmentTypeToNormName(
  type: string,
  action: string
): string | null {
  if (action === "REMOVE") return "Demontering utstyr";

  const mapping: Record<string, string> = {
    JUNCTION_BOX: "Koblingsboks installasjon",
    LIGHT_FIXTURE: "Lysarmatur installasjon",
    SWITCH: "Bryter/stikkontakt installasjon",
    OUTLET: "Bryter/stikkontakt installasjon",
    PANEL: "Tavle/panel installasjon",
    CABLE_TRAY: "Kabelgate/bro installasjon",
    MCT: "MCT (kabelgjennomforing)",
    INSTRUMENT: "Instrument installasjon (standard)",
    SENSOR: "Fotocelle/sensor installasjon",
    HORN: "Signalflagg/horn installasjon",
  };

  return mapping[type] || null;
}
