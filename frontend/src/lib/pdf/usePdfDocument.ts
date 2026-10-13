"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { loadPdfDocument } from "./documentCache";

export type PdfDocumentState =
  | { status: "loading" }
  | { status: "ready"; pdf: PDFDocumentProxy }
  | { status: "error"; message: string };

type Settled = {
  documentId: string;
  attempt: number;
  outcome:
    | { pdf: PDFDocumentProxy; message?: never }
    | { pdf?: never; message: string };
};

// Il risultato è memorizzato insieme alla richiesta a cui appartiene, così
// la risposta di un documento o di un tentativo precedente non viene mai esposta.
export function usePdfDocument(documentId: string) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPdfDocument(documentId).then(
      (pdf) => {
        if (!cancelled) {
          setSettled({ documentId, attempt, outcome: { pdf } });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setSettled({
            documentId,
            attempt,
            outcome: { message: errorMessage(error) },
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [documentId, attempt]);

  const current =
    settled?.documentId === documentId && settled.attempt === attempt
      ? settled.outcome
      : null;

  const state: PdfDocumentState = !current
    ? { status: "loading" }
    : current.pdf
      ? { status: "ready", pdf: current.pdf }
      : { status: "error", message: current.message };

  return { state, retry: () => setAttempt((n) => n + 1) };
}
