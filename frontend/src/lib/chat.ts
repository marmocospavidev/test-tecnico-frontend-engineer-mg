import type { APIChat } from "./types/api";
import type { ChatMessage, Message } from "./types/chat";

// Solo gli scambi di testo riusciti fanno parte del contesto inviato al backend.
export function toHistory(messages: ChatMessage[]): Message[] {
  const history: Message[] = [];

  for (const message of messages) {
    if (message.type === "content" && message.status !== "error") {
      history.push({ role: message.role, content: message.content });
    }
  }

  return history;
}

// Lo stesso file scelto due volte nella stessa selezione deve essere caricato una sola volta.
export function uniqueFiles(files: readonly File[]): File[] {
  const seen = new Set<string>();

  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

// I timestamp ISO senza offset si ordinano correttamente anche come stringhe.
export function newestFirst(chats: readonly APIChat[]): APIChat[] {
  return [...chats].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
}

// Lo stream non porta l'id della chat che crea, quindi viene recuperato
// cercando lo scambio appena completato.
export function findCreatedChat(
  chats: readonly APIChat[],
  exchange: { query: string; response: string },
): APIChat | undefined {
  return newestFirst(chats).find(
    (chat) =>
      chat.query === exchange.query &&
      chat.response === exchange.response,
  );
}
