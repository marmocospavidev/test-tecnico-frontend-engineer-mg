import type {
  DocumentReference,
  DocumentReferenceBoundingRegion,
} from "../types/chat";

// Ipotesi sul sistema di coordinate (verificate su backend/tests/bbox_visualization.py):
// - Le voci di `rects_in` sono [x, y, larghezza, altezza] in pollici.
// - L'origine è l'angolo in alto a sinistra della pagina e y cresce verso il
//   basso, la stessa orientazione del browser: non serve nessun ribaltamento.
// - Le pagine sono misurate come renderizzate (rotazione applicata) e 1 pollice
//   corrisponde a 72 punti PDF.
// Ogni conversione passa dagli helper qui sotto: i rettangoli diventano
// percentuali della dimensione della pagina, così qualsiasi overlay steso sulla
// pagina renderizzata resta allineato a ogni livello di zoom e larghezza.

export const PDF_POINTS_PER_INCH = 72;

export type Rect = [
  x: number,
  y: number,
  width: number,
  height: number,
];

export type PageSize = { width: number; height: number };

export type PercentBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function pointsToInches(points: number): number {
  return points / PDF_POINTS_PER_INCH;
}

export function isRect(value: unknown): value is Rect {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(
      (n) => typeof n === "number" && Number.isFinite(n),
    ) &&
    value[2] > 0 &&
    value[3] > 0
  );
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Riquadro di `rect` relativo alla pagina, in percentuale, limitato all'area della pagina.
export function rectToPercentBox(
  rect: Rect,
  page: PageSize,
): PercentBox {
  const [x, y, width, height] = rect;
  const left = clamp((x / page.width) * 100, 0, 100);
  const top = clamp((y / page.height) * 100, 0, 100);
  const right = clamp(((x + width) / page.width) * 100, 0, 100);
  const bottom = clamp(((y + height) / page.height) * 100, 0, 100);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

// Le references arrivano dalla rete: si tollerano campi mancanti o malformati.
function regionsOf(
  reference: DocumentReference,
): DocumentReferenceBoundingRegion[] {
  return Array.isArray(reference.bounding_regions)
    ? reference.bounding_regions
    : [];
}

function validRects(
  region: DocumentReferenceBoundingRegion,
): Rect[] {
  return Array.isArray(region.rects_in)
    ? region.rects_in.filter(isRect)
    : [];
}

// Rettangoli validi della reference che appartengono a `pageNumber`.
export function rectsForPage(
  reference: DocumentReference,
  pageNumber: number,
): Rect[] {
  return regionsOf(reference)
    .filter((region) => region.page_number === pageNumber)
    .flatMap(validRects);
}

export function hasHighlights(reference: DocumentReference): boolean {
  return regionsOf(reference).some(
    (region) => validRects(region).length > 0,
  );
}

// Pagina da mostrare per prima per una reference: la pagina della citazione,
// altrimenti la prima pagina che ha un'evidenziazione.
export function referencePage(reference: DocumentReference): number {
  const isPage = (n: unknown): n is number =>
    typeof n === "number" && Number.isInteger(n) && n > 0;

  if (isPage(reference.page_number)) return reference.page_number;

  return (
    regionsOf(reference).find(
      (region) =>
        isPage(region.page_number) && validRects(region).length > 0,
    )?.page_number ?? 1
  );
}
