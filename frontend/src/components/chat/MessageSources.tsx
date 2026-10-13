"use client";

import type { DocumentReference } from "@/lib/types/chat";
import { useState } from "react";
import { ReferenceList } from "./ReferenceList";
import { SourceDialog } from "./SourceDialog";

// Sezione di fact-checking di un singolo messaggio dell'assistant.
export function MessageSources({
  references,
}: {
  references: readonly DocumentReference[];
}) {
  const [selected, setSelected] = useState<number | null>(null);

  if (references.length === 0) return null;

  return (
    <section
      aria-label="Fonti e fact-checking"
      className="mt-3 border-t pt-3"
    >
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Fonti e fact-checking
      </h4>
      <ReferenceList
        references={references}
        selectedIndex={selected}
        onSelect={setSelected}
      />
      {selected !== null && (
        <SourceDialog
          references={references}
          selectedIndex={selected}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
