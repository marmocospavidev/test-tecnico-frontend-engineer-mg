"use client";

import { useChat } from "@/context/ChatContext";
import { useParams } from "next/navigation";
import { useEffect } from "react";

// Mantiene la conversazione aperta allineata all'URL. Non renderizza nulla.
export function ChatRouteSync() {
  const { chatId } = useParams<{ chatId?: string }>();
  const { openConversation, leaveChatRoutes } = useChat();
  const id = chatId ?? null;

  useEffect(() => {
    openConversation(id);
  }, [id, openConversation]);

  useEffect(() => leaveChatRoutes, [leaveChatRoutes]);

  return null;
}
