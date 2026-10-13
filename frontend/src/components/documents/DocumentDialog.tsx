"use client";

import { PdfViewer } from "@/components/pdf/PdfViewer";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { useGetDocumentQuery } from "@/store/chatApi";
import { useState } from "react";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

function Metadata({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-all">{children}</dd>
    </div>
  );
}

// Metadati e anteprima di un documento. Va montato con l'id del documento come
// `key`, così cambiando documento non si vedono mai i dati del precedente.
export function DocumentDialog({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  // `currentData` contiene solo i dati di questo id e viene servito dalla
  // cache se il documento era già stato aperto.
  const {
    currentData: document,
    error,
    isFetching,
    refetch,
  } = useGetDocumentQuery(documentId);
  const [page, setPage] = useState(1);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="h-[90dvh] max-w-5xl sm:w-[calc(100%-4rem)]">
        <DialogHeader>
          <DialogTitle>
            {document?.filename ?? "Dettagli del documento"}
          </DialogTitle>
          <DialogDescription>
            Metadati e anteprima del file caricato.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto md:grid-cols-[16rem_minmax(0,1fr)] md:overflow-visible">
          <div aria-busy={isFetching} aria-live="polite">
            {document ? (
              <dl className="flex flex-col gap-3">
                <Metadata label="Nome file">{document.filename}</Metadata>
                <Metadata label="ID">{document.id}</Metadata>
                <Metadata label="Tipo">{document.content_type}</Metadata>
                <Metadata label="Caricato il">
                  {formatDateTime(document.upload_date)}
                </Metadata>
                <Metadata label="Stato">
                  <DocumentStatusBadge status={document.status} />
                </Metadata>
                <Metadata label="Pagine">{document.page_count}</Metadata>
                {document.file_hash && (
                  <Metadata label="SHA-256">{document.file_hash}</Metadata>
                )}
              </dl>
            ) : error ? (
              <Alert variant="error">
                <div className="flex flex-col items-start gap-2">
                  <span>
                    Impossibile caricare i metadati: {errorMessage(error)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Riprova
                  </Button>
                </div>
              </Alert>
            ) : (
              <div className="flex flex-col gap-3" role="status" aria-label="Caricamento dei metadati">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            )}
          </div>
          <PdfViewer
            documentId={documentId}
            page={page}
            onPageChange={setPage}
            highlights={[]}
            className="min-h-96"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
