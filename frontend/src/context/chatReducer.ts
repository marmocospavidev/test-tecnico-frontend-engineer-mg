import type { APIChat, Document } from "../lib/types/api";
import type {
  ChatMessage,
  ChatMessageContent,
  DocumentReference,
} from "../lib/types/chat";

export type ChatState = {
  // Incrementato ogni volta che si apre un'altra conversazione: i risultati
  // asincroni con un epoch più vecchio appartengono a una conversazione non
  // più a schermo.
  epoch: number;
  nextMessageId: number;
  conversationId: string | null;
  load: {
    status: "idle" | "loading" | "error";
    error: string | null;
  };
  messages: ChatMessage[];
  // Il messaggio dell'assistant in streaming. I delta toccano solo questo
  // oggetto, quindi l'array `messages` consolidato mantiene la sua identità
  // durante lo streaming.
  // Il suo stato indica la fase: "pending" finché non arriva il primo chunk,
  // poi "streaming". Una richiesta di chat è attiva esattamente finché esiste.
  draft: ChatMessageContent | null;
  // "request": la richiesta è fallita prima che arrivasse del contenuto;
  // "stream": lo stream si è interrotto dopo l'arrivo di parte del contenuto.
  error: { kind: "request" | "stream"; message: string } | null;
  upload: {
    status: "idle" | "uploading";
    error: string | null;
  };
};

export type ChatAction =
  | { type: "conversation/opened"; id: string | null }
  | { type: "conversation/loaded"; epoch: number; chat: APIChat }
  | {
      type: "conversation/loadFailed";
      epoch: number;
      message: string;
    }
  | { type: "conversation/created"; epoch: number; id: string }
  | { type: "conversation/retried" }
  | { type: "message/sent"; query: string }
  | { type: "stream/delta"; epoch: number; text: string }
  | {
      type: "stream/references";
      epoch: number;
      references: DocumentReference[];
    }
  | { type: "stream/completed"; epoch: number }
  | { type: "stream/failed"; epoch: number; message: string }
  | { type: "upload/started" }
  | {
      type: "upload/succeeded";
      epoch: number;
      message: string;
      documents: Document[];
      // Indica se l'upload viene annunciato nella conversazione aperta.
      inConversation: boolean;
    }
  | { type: "upload/failed"; message: string };

export const initialChatState: ChatState = {
  epoch: 0,
  nextMessageId: 0,
  conversationId: null,
  load: { status: "idle", error: null },
  messages: [],
  draft: null,
  error: null,
  upload: { status: "idle", error: null },
};

function chatToMessages(
  chat: APIChat,
  firstId: number,
): ChatMessageContent[] {
  return [
    {
      type: "content",
      id: firstId,
      role: "user",
      content: chat.query,
      status: "complete",
    },
    {
      type: "content",
      id: firstId + 1,
      role: "assistant",
      content: chat.response,
      references: chat.citations,
      status: "complete",
    },
  ];
}

function commitDraft(
  state: ChatState,
  status: "complete" | "error",
): ChatState {
  if (!state.draft) return state;

  return {
    ...state,
    messages: [...state.messages, { ...state.draft, status }],
    draft: null,
  };
}

export function chatReducer(
  state: ChatState,
  action: ChatAction,
): ChatState {
  switch (action.type) {
    case "conversation/opened": {
      const isOpen =
        action.id === null
          ? state.conversationId === null &&
            state.messages.length === 0 &&
            state.draft === null
          : action.id === state.conversationId;

      if (isOpen) return state;

      return {
        ...state,
        epoch: state.epoch + 1,
        conversationId: action.id,
        load: {
          status: action.id === null ? "idle" : "loading",
          error: null,
        },
        messages: [],
        draft: null,
        error: null,
        upload: { ...state.upload, error: null },
      };
    }

    case "conversation/loaded": {
      if (
        action.epoch !== state.epoch ||
        state.load.status !== "loading" ||
        action.chat.id !== state.conversationId
      ) {
        return state;
      }

      return {
        ...state,
        nextMessageId: state.nextMessageId + 2,
        load: { status: "idle", error: null },
        messages: chatToMessages(action.chat, state.nextMessageId),
      };
    }

    case "conversation/loadFailed":
      if (
        action.epoch !== state.epoch ||
        state.load.status !== "loading"
      ) {
        return state;
      }

      return {
        ...state,
        load: { status: "error", error: action.message },
      };

    case "conversation/created":
      if (
        action.epoch !== state.epoch ||
        state.conversationId !== null
      ) {
        return state;
      }

      return { ...state, conversationId: action.id };

    case "conversation/retried":
      if (state.load.status !== "error") return state;

      return { ...state, load: { status: "loading", error: null } };

    case "message/sent": {
      if (
        state.draft ||
        state.load.status !== "idle" ||
        state.upload.status === "uploading"
      ) {
        return state;
      }

      const userId = state.nextMessageId;

      return {
        ...state,
        nextMessageId: userId + 2,
        error: null,
        messages: [
          ...state.messages,
          {
            type: "content",
            id: userId,
            role: "user",
            content: action.query,
            status: "complete",
          },
        ],
        draft: {
          type: "content",
          id: userId + 1,
          role: "assistant",
          content: "",
          status: "pending",
        },
      };
    }

    case "stream/delta":
      if (!state.draft || action.epoch !== state.epoch) return state;

      return {
        ...state,
        draft: {
          ...state.draft,
          content: state.draft.content + action.text,
          status: "streaming",
        },
      };

    case "stream/references":
      if (!state.draft || action.epoch !== state.epoch) return state;

      return {
        ...state,
        draft: { ...state.draft, references: action.references },
      };

    case "stream/completed":
      if (action.epoch !== state.epoch) return state;

      return commitDraft(state, "complete");

    case "stream/failed": {
      if (!state.draft || action.epoch !== state.epoch) return state;

      const kind = state.draft.status === "pending" ? "request" : "stream";

      // Ciò che è stato ricevuto prima del fallimento resta visibile.
      return {
        ...commitDraft(state, "error"),
        error: { kind, message: action.message },
      };
    }

    case "upload/started":
      // Upload e richieste di chat non si sovrappongono mai.
      if (state.draft || state.upload.status === "uploading") {
        return state;
      }

      return {
        ...state,
        upload: { status: "uploading", error: null },
      };

    case "upload/succeeded": {
      const settled: ChatState = {
        ...state,
        upload: { status: "idle", error: null },
      };

      if (!action.inConversation || action.epoch !== state.epoch) {
        return settled;
      }

      const known = new Set<string>();
      for (const message of state.messages) {
        if (message.type === "document") {
          message.documents.forEach((doc) => known.add(doc.id));
        }
      }

      const documents = action.documents.filter(
        (doc) => !known.has(doc.id),
      );

      if (documents.length === 0) return settled;

      return {
        ...settled,
        nextMessageId: state.nextMessageId + 1,
        messages: [
          ...state.messages,
          {
            type: "document",
            id: state.nextMessageId,
            role: "assistant",
            content: action.message,
            documents,
            status: "complete",
          },
        ],
      };
    }

    case "upload/failed":
      return {
        ...state,
        upload: { status: "idle", error: action.message },
      };
  }
}
