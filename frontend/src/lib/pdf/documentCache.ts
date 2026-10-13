import type { PDFDocumentProxy } from "pdfjs-dist";
import { getDocumentFile } from "../api";

// pdf.js usa variabili globali del browser quando viene importato, quindi è
// caricato in modo lazy e solo sul client.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    return pdfjs;
  });

  return pdfjsPromise;
}

// I documenti già analizzati vengono riusati mentre l'utente passa tra
// citazioni e pagine. Se ne tengono solo pochi: quello usato meno di recente
// viene distrutto, liberando le sue risorse lato worker.
const MAX_CACHED_DOCUMENTS = 4;
const cache = new Map<string, Promise<PDFDocumentProxy>>();

export function loadPdfDocument(
  documentId: string,
): Promise<PDFDocumentProxy> {
  const cached = cache.get(documentId);

  if (cached) {
    cache.delete(documentId);
    cache.set(documentId, cached);
    return cached;
  }

  const loading = (async () => {
    const [pdfjs, data] = await Promise.all([
      loadPdfjs(),
      getDocumentFile(documentId),
    ]);

    return pdfjs.getDocument({ data }).promise;
  })();

  cache.set(documentId, loading);

  // Un caricamento fallito non deve restare in cache, così un nuovo tentativo riscarica.
  loading.catch(() => {
    if (cache.get(documentId) === loading) cache.delete(documentId);
  });

  for (const [id, entry] of cache) {
    if (cache.size <= MAX_CACHED_DOCUMENTS) break;

    cache.delete(id);
    entry.then((pdf) => pdf.loadingTask.destroy()).catch(() => {});
  }

  return loading;
}
