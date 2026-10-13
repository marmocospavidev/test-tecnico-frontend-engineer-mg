import { ChatRequest, DocumentReference } from "./chat";

export interface APILoginResponseSuccess {
  user_id: string;
}

export interface APILoginResponseFailure {
  detail: {
    type: string;
    loc: (string | number)[];
    msg: string;
    input?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx?: Record<string, any>;
  }[];
}

export type APILoginResponse =
  | APILoginResponseSuccess
  | APILoginResponseFailure;

export type StreamChunk =
  | {
      type: "content";
      delta: string;
    }
  | {
      type: "citations";
      references: DocumentReference[];
    };

export type StreamErrorChunk = {
  type: "error";
  message: string;
};

// Ogni riga che il backend può emettere sullo stream NDJSON.
export type StreamEvent = StreamChunk | StreamErrorChunk;

export type FetchStreamOptions = {
  data: ChatRequest;
  cookie: string;
  onMessage: (chunk: StreamChunk) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

// Uno scambio salvato (una domanda e la sua risposta) come restituito da GET /chat.
export interface APIChat {
  id: string;
  user_id: string;
  created_at: string;
  query: string;
  response: string;
  citations?: DocumentReference[];
}

export interface Document {
  id: string;
  filename: string;
  content_type: string;
  upload_date: string;
  status: string;
  page_count: number;
  file_hash: string;
}

export interface APIUploadDocumentsResponseSuccess {
  message: string;
  documents: Document[];
}

export interface APIUploadDocumentsResponseFailed {
  detail: string;
}

export type APIUploadDocumentsResponse =
  | APIUploadDocumentsResponseSuccess
  | APIUploadDocumentsResponseFailed;
