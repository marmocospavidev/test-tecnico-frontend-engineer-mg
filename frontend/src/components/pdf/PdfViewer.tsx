"use client";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { Rect } from "@/lib/pdf/geometry";
import { usePdfDocument } from "@/lib/pdf/usePdfDocument";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PdfPage } from "./PdfPage";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

// Mostra un documento recuperato dal backend. Pagina ed evidenziazioni sono
// controllate dal componente padre (ad esempio dalla citazione selezionata).
export function PdfViewer({
  documentId,
  page,
  onPageChange,
  highlights,
  className,
}: {
  documentId: string;
  page: number;
  onPageChange: (page: number) => void;
  highlights: readonly Rect[];
  className?: string;
}) {
  const { state, retry } = usePdfDocument(documentId);
  const [zoom, setZoom] = useState(1);
  const [containerRef, containerWidth] =
    useElementWidth<HTMLDivElement>();

  const numPages = state.status === "ready" ? state.pdf.numPages : 0;
  const currentPage = numPages
    ? Math.min(Math.max(page, 1), numPages)
    : page;
  // contentRect esclude già il padding; lo spazio della scrollbar è
  // riservato, così la sua comparsa non cambia la larghezza misurata.
  const pageWidth = containerWidth * zoom;

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col gap-2 ${className ?? ""}`}
      aria-busy={state.status === "loading"}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2"
        role="toolbar"
        aria-label="Controlli del documento"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Pagina precedente"
            disabled={currentPage <= 1 || state.status !== "ready"}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft />
          </Button>
          <span
            className="min-w-24 text-center text-sm tabular-nums"
            aria-live="polite"
          >
            {state.status === "ready"
              ? `Pagina ${currentPage} di ${numPages}`
              : "Pagina –"}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Pagina successiva"
            disabled={currentPage >= numPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Riduci zoom"
            disabled={zoom <= MIN_ZOOM}
            onClick={() =>
              setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM))
            }
          >
            <Minus />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-w-14 tabular-nums"
            aria-label="Ripristina zoom"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Aumenta zoom"
            disabled={zoom >= MAX_ZOOM}
            onClick={() =>
              setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM))
            }
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-2 [scrollbar-gutter:stable]"
      >
        {state.status === "loading" && (
          <div
            className="flex flex-col items-center gap-3 py-8"
            role="status"
          >
            <Spinner />
            <span className="text-sm text-muted-foreground">
              Caricamento del documento…
            </span>
            <Skeleton className="h-64 w-full max-w-md" />
          </div>
        )}
        {state.status === "error" && (
          <Alert variant="error">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Impossibile caricare il documento: {state.message}
              </span>
              <Button variant="outline" size="sm" onClick={retry}>
                Riprova
              </Button>
            </div>
          </Alert>
        )}
        {state.status === "ready" && pageWidth > 0 && (
          <PdfPage
            key={documentId}
            pdf={state.pdf}
            pageNumber={currentPage}
            width={pageWidth}
            highlights={highlights}
          />
        )}
      </div>
    </div>
  );
}
