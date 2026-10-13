import type { StreamEvent } from "./types/api";

function isStreamEvent(value: unknown): value is StreamEvent {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value)
  ) {
    return false;
  }

  switch (value.type) {
    case "content":
      return "delta" in value && typeof value.delta === "string";
    case "citations":
      return (
        "references" in value && Array.isArray(value.references)
      );
    case "error":
      return (
        "message" in value && typeof value.message === "string"
      );
    default:
      return false;
  }
}

export function parseStreamLine(line: string): StreamEvent {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error("Risposta dello stream non valida");
  }

  if (!isStreamEvent(parsed)) {
    throw new Error("Evento dello stream non riconosciuto");
  }

  return parsed;
}

// Chiama `onLine` per ogni riga non vuota dello stream. I chunk possono
// spezzare una riga (o un carattere multi-byte) in qualsiasi punto, e
// l'ultima riga può non avere il newline finale.
export async function readLines(
  body: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emit = (line: string) => {
    if (line.trim()) onLine(line);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      lines.forEach(emit);
    }

    buffer += decoder.decode();
    emit(buffer);
  } finally {
    reader.releaseLock();
  }
}
