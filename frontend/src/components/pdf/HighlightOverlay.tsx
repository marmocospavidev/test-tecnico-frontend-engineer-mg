import { rectToPercentBox, type PageSize, type Rect } from "@/lib/pdf/geometry";

// Disegna le evidenziazioni sopra una pagina. Va steso sopra la pagina
// renderizzata (stesso riquadro), così le posizioni in percentuale restano
// allineate a qualsiasi dimensione.
export function HighlightOverlay({
  rects,
  pageSize,
}: {
  rects: readonly Rect[];
  pageSize: PageSize;
}) {
  if (rects.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-slot="highlight-overlay"
    >
      {rects.map((rect, index) => {
        const box = rectToPercentBox(rect, pageSize);

        return (
          <div
            key={index}
            data-highlight=""
            className="absolute rounded-xs bg-amber-300/40 ring-2 ring-amber-500 mix-blend-multiply"
            style={{
              left: `${box.left}%`,
              top: `${box.top}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          />
        );
      })}
    </div>
  );
}
