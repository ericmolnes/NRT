/**
 * Parser for EFONELFO v4.0 prisfiler.
 * Formatet er semikolondelt med tre posttyper:
 * - VH: Header med leverandorinfo og gyldighet
 * - VL: Produktlinje
 * - VX: Utvidet data (bilder) tilhorende foregaende VL
 */

export interface EfoHeader {
  format: string; // "EFONELFO"
  version: string; // "4.0"
  vatNumber: string;
  validFrom: string; // "20260301"
  validTo: string; // "20280219"
  currency: string; // "NOK"
  fileType: string; // "PRISFIL"
  supplier: string; // "Ahlsell Norge AS"
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface EfoProduct {
  categoryCode: string; // 0=produkt, 1=spesial, 4=verktoy
  productId: string;
  name: string;
  description: string;
  quantityPerUnit: number;
  unitCode: string; // "EA", "MTR", "CT"
  unitName: string; // "STYKK", "METER", "KARTONG"
  priceOre: number;
  validFrom: string;
  discountGroup: string;
  classification: string;
  manufacturer: string;
  supplierProductId: string;
  stocked: boolean;
  imageUrl: string | null;
}

export interface EfoParseResult {
  header: EfoHeader;
  products: EfoProduct[];
}

function parseHeader(fields: string[]): EfoHeader {
  return {
    format: fields[1] || "",
    version: fields[2] || "",
    vatNumber: fields[3] || "",
    validFrom: fields[6] || "",
    validTo: fields[7] || "",
    currency: fields[8] || "NOK",
    fileType: fields[9] || "",
    supplier: fields[10] || "",
    address: fields[11] || "",
    postalCode: fields[13] || "",
    city: fields[14] || "",
    country: fields[15] || "",
  };
}

function parseProductLine(fields: string[]): EfoProduct {
  return {
    categoryCode: fields[1] || "0",
    productId: fields[2] || "",
    name: fields[3] || "",
    description: fields[4] || "",
    quantityPerUnit: parseInt(fields[5] || "1", 10) || 1,
    unitCode: fields[6] || "EA",
    unitName: fields[7] || "STYKK",
    priceOre: parseInt(fields[8] || "0", 10) || 0,
    validFrom: fields[10] || "",
    discountGroup: fields[11] || "",
    classification: fields[13] || "",
    manufacturer: (fields[14] || "").trim(),
    supplierProductId: fields[15] || "",
    stocked: fields[16] === "J",
    imageUrl: null,
  };
}

/**
 * Parser en EFO v4.0 prisfil fra tekst-innhold.
 * Handterer VH, VL og VX posttyper.
 */
export function parseEfoFile(content: string): EfoParseResult {
  const lines = content.split("\n");
  let header: EfoHeader | null = null;
  const products: EfoProduct[] = [];
  let lastProduct: EfoProduct | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const fields = trimmed.split(";");
    const recordType = fields[0];

    switch (recordType) {
      case "VH":
        header = parseHeader(fields);
        break;
      case "VL":
        lastProduct = parseProductLine(fields);
        products.push(lastProduct);
        break;
      case "VX":
        if (lastProduct && fields[1] === "BILDE" && fields[2]) {
          lastProduct.imageUrl = fields[2];
        }
        break;
    }
  }

  if (!header) {
    throw new Error("Ugyldig EFO-fil: mangler VH-header");
  }

  return { header, products };
}

/**
 * Parser EFO-dato fra "YYYYMMDD" til Date-objekt.
 */
export function parseEfoDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}
