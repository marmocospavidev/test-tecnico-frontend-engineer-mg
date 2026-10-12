"use client";

import { chat } from "@/lib/api";
import { ChatMessage } from "@/lib/types/chat";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

type Message = ChatMessage & {
  id: number;
  status: "complete" | "streaming" | "error";
};

type ChatContextType = {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
};

const ChatContext = createContext<
  ChatContextType | undefined
>(undefined);

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextId = useRef(0);
  const session = useAuth();

  const updateLastMessage = useCallback(
    (id: number, update: (message: Message) => Message) => {
      setMessages((prev) => {
        const lastIndex = prev.length - 1;

        if (lastIndex < 0 || prev[lastIndex].id !== id) {
          return prev;
        }

        const next = [...prev];
        next[lastIndex] = update(prev[lastIndex]);

        return next;
      });
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const query = content.trim();

      if (!query || isStreaming || !session) return;

      setError(null);
      setIsStreaming(true);

      const userMessageId = nextId.current++;
      const assistantMessageId = nextId.current++;

      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: query,
        status: "complete",
      };

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "streaming",
      };

      const history = messages
        .filter((message) => message.status !== "error")
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);

      let contentBuffer = "";

      const flushContent = () => {
        if (!contentBuffer) return;

        const content = contentBuffer;
        contentBuffer = "";

        updateLastMessage(
          assistantMessageId,
          (message) => ({
            ...message,
            content: message.content + content,
          }),
        );
      };

      let failed = false;

      try {
        await chat({
          data: {
            query,
            history,
          },
          cookie: session.user_id,
          onMessage: (chunk) => {
            if (chunk.type === "content") {
              contentBuffer += chunk.delta;

              if (contentBuffer.includes(" ")) {
                flushContent();
              }

              return;
            }

            if (chunk.type === "citations") {
              flushContent();
              updateLastMessage(
                assistantMessageId,
                (message) => ({
                  ...message,
                  references: chunk.references,
                }),
              );
            }
          },
        });
        flushContent();
      } catch (err) {
        failed = true;
        const message =
          err instanceof Error
            ? err.message
            : "Errore durante la comunicazione con l'API";

        setError(message);

        updateLastMessage(
          assistantMessageId,
          (current) => ({
            ...current,
            status: "error",
          }),
        );
      } finally {
        if (!failed) {
          updateLastMessage(
            assistantMessageId,
            (current) => ({
              ...current,
              status: "complete",
            }),
          );
        }

        setIsStreaming(false);
      }
    },
    [messages, isStreaming, session, updateLastMessage],
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        isStreaming,
        error,
        sendMessage,
      }}
    >
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
