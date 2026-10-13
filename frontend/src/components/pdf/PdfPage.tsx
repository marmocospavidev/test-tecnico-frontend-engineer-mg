"use client";

import {
  pointsToInches,
  type PageSize,
  type Rect,
} from "@/lib/pdf/geometry";
import { errorMessage } from "@/lib/utils";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { HighlightOverlay } from "./HighlightOverlay";
import { Alert } from "@/components/ui/alert";

// Evita che livelli di zoom molto alti allochino canvas enormi.
const MAX_CANVAS_WIDTH = 4096;

type LoadedPage = {
  pageNumber: number;
  page: PDFPageProxy;
  size: PageSize;
};

// Renderizza una pagina di `pdf` alla larghezza `width` in pixel CSS, con le
// sue evidenziazioni. Va montato con una `key` che identifica il documento.
export function PdfPage({
  pdf,
  pageNumber,
  width,
  highlights,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  highlights: readonly Rect[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<LoadedPage | null>(null);
  const [rendered, setRendered] = useState<PDFPageProxy | null>(
    null,
  );
  const [failure, setFailure] = useState<{
    pageNumber: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    pdf.getPage(pageNumber).then(
      (page) => {
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });

        setLoaded({
          pageNumber,
          page,
          size: {
            width: pointsToInches(viewport.width),
            height: pointsToInches(viewport.height),
          },
        });
      },
      (error: unknown) => {
        if (!cancelled) {
          setFailure({ pageNumber, message: errorMessage(error) });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!loaded || !canvas || width <= 0) return;

    const { page, pageNumber: renderedPage } = loaded;
    const base = page.getViewport({ scale: 1 });
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_CANVAS_WIDTH / width,
    );
    const viewport = page.getViewport({
      scale: (width / base.width) * pixelRatio,
    });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const task = page.render({ canvas, viewport });

    task.promise.then(
      () => setRendered(page),
      (error: unknown) => {
        if (
          error instanceof Error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }

        setFailure({
          pageNumber: renderedPage,
          message: errorMessage(error),
        });
      },
    );

    return () => task.cancel();
  }, [loaded, width]);

  const failed = failure?.pageNumber === pageNumber;

  // Il canvas continua a mostrare la pagina precedente finché la nuova non è
  // pronta; le evidenziazioni sono disegnate solo se appartengono alla
  // pagina a schermo.
  const isReady =
    !failed &&
    loaded?.pageNumber === pageNumber &&
    rendered === loaded.page;

  useEffect(() => {
    if (!isReady) return;

    overlayRef.current
      ?.querySelector("[data-highlight]")
      ?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [isReady, highlights]);

  return (
    <div
      className="relative bg-white shadow-sm ring-1 ring-foreground/10"
      style={{
        width,
        aspectRatio: loaded
          ? loaded.size.width / loaded.size.height
          : 1 / Math.SQRT2,
      }}
      aria-busy={!isReady && !failed}
    >
      <canvas
        ref={canvasRef}
        className="block size-full"
        aria-label={`Pagina ${pageNumber}`}
        role="img"
      />
      <div ref={overlayRef} className="absolute inset-0">
        {isReady && loaded && (
          <HighlightOverlay
            rects={highlights}
            pageSize={loaded.size}
          />
        )}
      </div>
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4">
          <Alert variant="error">
            Impossibile visualizzare la pagina: {failure.message}
          </Alert>
        </div>
      )}
    </div>
  );
}
