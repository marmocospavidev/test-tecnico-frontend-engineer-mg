"use client";

import { chat, uploadDocuments } from "@/lib/api";
import { findCreatedChat, toHistory, uniqueFiles } from "@/lib/chat";
import { ChatSchema } from "@/lib/schemas/ChatSchema";
import { PDFSchema } from "@/lib/schemas/PDFSchema";
import type { ChatMessage, ChatMessageContent } from "@/lib/types/chat";
import { errorMessage } from "@/lib/utils";
import { chatApi, useGetChatQuery } from "@/store/chatApi";
import { useAppDispatch } from "@/store/hooks";
import { skipToken } from "@reduxjs/toolkit/query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { chatReducer, initialChatState, type ChatState } from "./chatReducer";

type ChatContextType = {
  conversationId: string | null;
  // Messaggi consolidati. La risposta in streaming è tenuta a parte, così i
  // delta non ricostruiscono questo array.
  messages: ChatMessage[];
  streamingMessage: ChatMessageContent | null;
  isStreaming: boolean;
  isLoadingConversation: boolean;
  conversationError: string | null;
  error: ChatState["error"];
  isUploading: boolean;
  uploadError: string | null;
  sendMessage: (content: string) => Promise<void>;
  // `inConversation: false` carica i file senza aggiungere un messaggio alla
  // chat aperta (usato dalla pagina dei documenti).
  uploadFiles: (
    files: File[],
    options?: { inConversation?: boolean },
  ) => Promise<void>;
  // Rende `id` (null per una nuova chat) la conversazione aperta. L'URL è la
  // fonte di verità e chiama questa funzione a ogni cambio di route.
  openConversation: (id: string | null) => void;
  // Chiamata quando si escono dalle route della chat.
  leaveChatRoutes: () => void;
  // Scarta la conversazione corrente quando l'utente chiede una nuova chat.
  startNewChat: () => void;
  retryConversation: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(
  undefined,
);

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session = useAuth();
  const router = useRouter();
  const appDispatch = useAppDispatch();
  const [state, dispatch] = useReducer(
    chatReducer,
    initialChatState,
  );

  // Le callback asincrone leggono da qui l'ultimo stato consolidato.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Protezioni sincrone: lo stato non è ancora aggiornato quando una seconda
  // chiamata arriva nello stesso tick.
  const activeStream = useRef<AbortController | null>(null);
  const isUploadingRef = useRef(false);
  // Id della conversazione selezionata dall'URL: null su /chat, undefined
  // quando l'utente è fuori dalle route della chat (ad esempio /documents).
  const routeConversationId = useRef<string | null | undefined>(
    undefined,
  );

  const abortActiveStream = useCallback(() => {
    const controller = activeStream.current;
    activeStream.current = null;
    controller?.abort();
  }, []);

  useEffect(() => abortActiveStream, [abortActiveStream]);

  const openConversation = useCallback(
    (id: string | null) => {
      const wasOutsideChat = routeConversationId.current === undefined;
      routeConversationId.current = id;

      const { conversationId } = stateRef.current;

      // Già aperta, oppure ritorno alla nuova chat non salvata che era stata lasciata.
      if (
        id === null
          ? wasOutsideChat && conversationId === null
          : id === conversationId
      ) {
        return;
      }

      abortActiveStream();
      dispatch({ type: "conversation/opened", id });
    },
    [abortActiveStream],
  );

  const leaveChatRoutes = useCallback(() => {
    routeConversationId.current = undefined;
  }, []);

  // Da /chat/[chatId] è il cambio di route stesso a reimpostare la
  // conversazione; altrove nessun cambio di route segue, quindi il reset
  // avviene qui.
  const startNewChat = useCallback(() => {
    if (typeof routeConversationId.current === "string") return;

    abortActiveStream();
    dispatch({ type: "conversation/opened", id: null });
  }, [abortActiveStream]);

  const retryConversation = useCallback(() => {
    dispatch({ type: "conversation/retried" });
  }, []);

  // Caricamento iniziale di una conversazione esistente. RTK Query
  // deduplica le richieste concorrenti, serve le visite ripetute dalla cache
  // ed espone `currentData` solo per l'id richiesto, quindi una risposta in
  // ritardo di una conversazione precedente non può mai essere applicata.
  const isLoading = state.load.status === "loading";
  const {
    currentData: loadedChat,
    error: loadError,
    isError: isLoadError,
  } = useGetChatQuery(
    isLoading && state.conversationId
      ? state.conversationId
      : skipToken,
  );

  useEffect(() => {
    if (!isLoading) return;

    if (loadedChat && loadedChat.id === state.conversationId) {
      dispatch({
        type: "conversation/loaded",
        epoch: state.epoch,
        chat: loadedChat,
      });
    } else if (isLoadError) {
      dispatch({
        type: "conversation/loadFailed",
        epoch: state.epoch,
        message: errorMessage(loadError),
      });
    }
  }, [
    isLoading,
    loadedChat,
    isLoadError,
    loadError,
    state.conversationId,
    state.epoch,
  ]);

  // Dopo il salvataggio di uno stream: per una nuova conversazione trova il
  // suo id, porta l'URL a /chat/[id] e aggiorna le chat recenti con una sola
  // richiesta; per una esistente invalida solo la lista.
  const syncAfterStream = useCallback(
    async (
      epoch: number,
      exchange: { query: string; response: string },
    ) => {
      if (stateRef.current.conversationId !== null) {
        appDispatch(chatApi.util.invalidateTags(["Chats"]));
        return;
      }

      // Una richiesta già in corso può essere precedente alla nuova chat: si riprova una volta.
      for (let attempt = 0; attempt < 2; attempt++) {
        const request = appDispatch(
          chatApi.endpoints.listChats.initiate(undefined, {
            forceRefetch: true,
          }),
        );

        try {
          const created = findCreatedChat(
            await request.unwrap(),
            exchange,
          );
          const latest = stateRef.current;

          if (
            latest.epoch !== epoch ||
            latest.conversationId !== null
          ) {
            return;
          }

          if (created) {
            dispatch({
              type: "conversation/created",
              epoch,
              id: created.id,
            });

            // Nel frattempo l'utente può essere passato a un'altra sezione.
            if (routeConversationId.current !== undefined) {
              router.replace(`/chat/${created.id}`);
            }

            return;
          }
        } catch {
          // L'errore è già segnalato dalla query della sidebar.
          return;
        } finally {
          request.unsubscribe();
        }
      }
    },
    [appDispatch, router],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const parsed = ChatSchema.safeParse({
        query: content.trim(),
      });
      const current = stateRef.current;

      if (
        !parsed.success ||
        !session ||
        activeStream.current ||
        isUploadingRef.current ||
        current.draft ||
        current.load.status !== "idle"
      ) {
        return;
      }

      const { query } = parsed.data;
      const { epoch } = current;
      const history = toHistory(current.messages);
      const controller = new AbortController();

      activeStream.current = controller;
      dispatch({ type: "message/sent", query });

      let response = "";
      let pending = "";
      let frame: number | null = null;
      let completed = false;

      // I delta arrivano molte volte al secondo: vengono applicati al massimo
      // una volta per frame.
      const flush = () => {
        if (frame !== null) {
          cancelAnimationFrame(frame);
          frame = null;
        }

        if (!pending) return;

        const text = pending;
        pending = "";
        dispatch({ type: "stream/delta", epoch, text });
      };

      try {
        await chat({
          data: { query, history },
          cookie: session.user_id,
          signal: controller.signal,
          onMessage: (chunk) => {
            if (chunk.type === "content") {
              response += chunk.delta;
              pending += chunk.delta;
              frame ??= requestAnimationFrame(flush);
              return;
            }

            flush();
            dispatch({
              type: "stream/references",
              epoch,
              references: chunk.references,
            });
          },
        });

        if (!response) throw new Error("Risposta vuota dal server");

        flush();
        dispatch({ type: "stream/completed", epoch });
        completed = true;
      } catch (error) {
        // Interrotto perché è stata aperta un'altra conversazione.
        if (controller.signal.aborted) return;

        flush();
        dispatch({
          type: "stream/failed",
          epoch,
          message: errorMessage(error),
        });
      } finally {
        if (frame !== null) cancelAnimationFrame(frame);

        if (activeStream.current === controller) {
          activeStream.current = null;
        }
      }

      if (completed) await syncAfterStream(epoch, { query, response });
    },
    [session, syncAfterStream],
  );

  const uploadFiles = useCallback(
    async (
      files: File[],
      { inConversation = true }: { inConversation?: boolean } = {},
    ) => {
      if (
        !session ||
        isUploadingRef.current ||
        activeStream.current ||
        stateRef.current.draft
      ) {
        return;
      }

      const parsed = PDFSchema.safeParse({
        files: uniqueFiles(files),
      });

      if (!parsed.success) {
        dispatch({
          type: "upload/failed",
          message:
            parsed.error.issues[0]?.message ??
            "File non validi",
        });
        return;
      }

      const { epoch } = stateRef.current;

      isUploadingRef.current = true;
      dispatch({ type: "upload/started" });

      try {
        const result = await uploadDocuments(parsed.data.files);

        if (result.success) {
          appDispatch(chatApi.util.invalidateTags(["Documents"]));
        }

        dispatch(
          result.success
            ? {
                type: "upload/succeeded",
                epoch,
                message: result.message,
                documents: result.documents,
                inConversation,
              }
            : { type: "upload/failed", message: result.detail },
        );
      } finally {
        isUploadingRef.current = false;
      }
    },
    [session, appDispatch],
  );

  const value = useMemo<ChatContextType>(
    () => ({
      conversationId: state.conversationId,
      messages: state.messages,
      streamingMessage: state.draft,
      isStreaming: state.draft !== null,
      isLoadingConversation: state.load.status === "loading",
      conversationError: state.load.error,
      error: state.error,
      isUploading: state.upload.status === "uploading",
      uploadError: state.upload.error,
      sendMessage,
      uploadFiles,
      openConversation,
      leaveChatRoutes,
      startNewChat,
      retryConversation,
    }),
    [
      state,
      sendMessage,
      uploadFiles,
      openConversation,
      leaveChatRoutes,
      startNewChat,
      retryConversation,
    ],
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat deve essere usato dentro ChatProvider",
    );
  }

  return context;
}
