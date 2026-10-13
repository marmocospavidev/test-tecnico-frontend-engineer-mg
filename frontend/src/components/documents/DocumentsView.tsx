"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useChat } from "@/context/ChatContext";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { useListDocumentsQuery } from "@/store/chatApi";
import { FileText, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { DocumentDialog } from "./DocumentDialog";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

export function DocumentsView() {
  const { data, error, isLoading, isFetching, refetch } =
    useListDocumentsQuery();
  const { uploadFiles, isUploading, isStreaming, uploadError } =
    useChat();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const documents = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) =>
        a.upload_date < b.upload_date ? 1 : -1,
      ),
    [data],
  );

  const canUpload = !isUploading && !isStreaming;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const files = Array.from(input.files ?? []);

    // Permette di selezionare di nuovo lo stesso file.
    input.value = "";

    if (files.length > 0) {
      void uploadFiles(files, { inConversation: false });
    }
  };

  return (
    <div className="h-full overflow-y-auto px-3 pt-2 pb-8 sm:px-4 sm:pt-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold sm:text-2xl">
              Documenti
            </h1>
            <p className="text-sm text-muted-foreground">
              I PDF caricati e disponibili per le risposte della chat.
            </p>
          </div>
          <Button
            nativeButton={false}
            aria-disabled={!canUpload}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            render={<label htmlFor="documents-upload" className="cursor-pointer" />}
          >
            {isUploading ? <Spinner /> : <Upload />}
            Carica documenti
            <input
              id="documents-upload"
              type="file"
              accept="application/pdf"
              multiple
              disabled={!canUpload}
              onChange={handleFileChange}
              className="sr-only"
            />
          </Button>
        </div>

        <div aria-live="polite" className="flex flex-col gap-2">
          {isUploading && (
            <Alert variant="info">
              <span className="flex items-center gap-2">
                <Spinner />
                Caricamento dei documenti in corso…
              </span>
            </Alert>
          )}
          {isStreaming && !isUploading && (
            <Alert variant="warning">
              Il caricamento è disabilitato mentre la chat sta
              generando una risposta.
            </Alert>
          )}
          {isFetching && data && !isUploading && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Spinner />
              Aggiornamento della lista…
            </p>
          )}
        </div>

        {uploadError && <Alert variant="error">{uploadError}</Alert>}

        {isLoading ? (
          <ul
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy
            aria-label="Caricamento dei documenti"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-28 w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : error && !data ? (
          <Alert variant="error">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Impossibile caricare i documenti: {errorMessage(error)}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Riprova
              </Button>
            </div>
          </Alert>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="font-medium">Nessun documento caricato</p>
            <p className="text-sm text-muted-foreground">
              Carica un PDF con il pulsante “Carica documenti” per
              poterlo consultare e usarlo come fonte nella chat.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <li key={document.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(document.id)}
                  className="flex h-full w-full flex-col gap-2 rounded-xl bg-card p-4 text-left text-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium break-all">
                      {document.filename}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <DocumentStatusBadge status={document.status} />
                    <span>{document.page_count} pagine</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Caricato il {formatDateTime(document.upload_date)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedId && (
        <DocumentDialog
          key={selectedId}
          documentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
