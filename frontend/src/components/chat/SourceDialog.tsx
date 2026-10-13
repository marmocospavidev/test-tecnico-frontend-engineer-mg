"use client";

import { PdfViewer } from "@/components/pdf/PdfViewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasHighlights,
  referencePage,
  rectsForPage,
} from "@/lib/pdf/geometry";
import type { DocumentReference } from "@/lib/types/chat";
import { useMemo, useState } from "react";
import { ReferenceList } from "./ReferenceList";

// Mostra il documento della citazione selezionata alla pagina citata, con le
// bounding region evidenziate. Passando tra citazioni dello stesso documento
// cambiano solo pagina ed evidenziazioni: il PDF già analizzato viene riusato.
export function SourceDialog({
  references,
  selectedIndex,
  onSelect,
  onClose,
}: {
  references: readonly DocumentReference[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const reference = references[selectedIndex];
  const [manualPage, setManualPage] = useState<{
    index: number;
    page: number;
  } | null>(null);

  const page =
    manualPage?.index === selectedIndex
      ? manualPage.page
      : referencePage(reference);

  const highlights = useMemo(
    () => rectsForPage(reference, page),
    [reference, page],
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="h-[90dvh] max-w-6xl sm:w-[calc(100%-4rem)]">
        <DialogHeader>
          <DialogTitle>{reference.filename}</DialogTitle>
          <DialogDescription>
            Citazione a pagina {referencePage(reference)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex max-h-40 min-h-0 flex-col gap-2 overflow-y-auto md:max-h-none">
            <ReferenceList
              references={references}
              selectedIndex={selectedIndex}
              onSelect={onSelect}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <blockquote className="max-h-24 shrink-0 overflow-y-auto border-l-2 border-amber-500 pl-3 text-sm italic">
              {reference.text_quote || "Testo della citazione non disponibile"}
            </blockquote>
            {!hasHighlights(reference) && (
              <p className="shrink-0 text-xs text-muted-foreground">
                Per questa citazione non sono disponibili regioni da
                evidenziare: fai riferimento al testo citato.
              </p>
            )}
            <PdfViewer
              documentId={reference.document_id}
              page={page}
              onPageChange={(next) =>
                setManualPage({ index: selectedIndex, page: next })
              }
              highlights={highlights}
              className="flex-1"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
