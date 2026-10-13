"use client";

import { referencePage } from "@/lib/pdf/geometry";
import type { DocumentReference } from "@/lib/types/chat";
import { cn } from "cn";

export function ReferenceList({
  references,
  selectedIndex,
  onSelect,
}: {
  references: readonly DocumentReference[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="flex flex-col gap-1.5">
      {references.map((reference, index) => (
        <li key={index}>
          <button
            type="button"
            onClick={() => onSelect(index)}
            aria-current={index === selectedIndex}
            className={cn(
              "flex w-full flex-col gap-0.5 rounded-lg border p-2.5 text-left text-[0.8125rem] leading-snug transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              index === selectedIndex && "border-primary bg-accent",
            )}
          >
            <span className="font-medium">
              {index + 1}. {reference.filename} · pag.{" "}
              {referencePage(reference)}
            </span>
            <span className="line-clamp-2 text-muted-foreground italic">
              “{reference.text_quote}”
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
