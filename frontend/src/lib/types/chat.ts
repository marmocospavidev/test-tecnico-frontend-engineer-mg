import { Document } from "./api";

export interface DocumentReferenceBoundingRegion {
  page_number: number;
  rects_in: number[][];
}

export type DocumentReference = {
  document_id: string;
  filename: string;
  page_number: number;
  text_quote: string;
  bounding_regions: DocumentReferenceBoundingRegion[];
};

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// pending: il messaggio dell'assistant esiste ma non è ancora arrivato nulla;
// streaming: il contenuto sta arrivando; complete / error: la richiesta è conclusa.
export type ChatStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error";

export type ChatMessageContent = Message & {
  type: "content";
  id: number;
  references?: DocumentReference[];
  status: ChatStatus;
};

export type ChatMessageDocument = Message & {
  type: "document";
  id: number;
  content?: string;
  documents: Document[];
  references?: DocumentReference[];
  status: ChatStatus;
};

export type ChatMessage =
  | ChatMessageContent
  | ChatMessageDocument;

export type ChatRequest = {
  query: string;
  history: Message[];
};
