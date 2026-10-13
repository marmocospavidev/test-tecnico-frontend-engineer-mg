"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useChat } from "@/context/ChatContext";
import { newestFirst } from "@/lib/chat";
import { useListChatsQuery } from "@/store/chatApi";
import { MessageSquare, SquarePen } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const MAX_RECENT_CHATS = 20;

export function NewChatMenuItem() {
  const { startNewChat } = useChat();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href="/chat" onClick={startNewChat} />}
      >
        <SquarePen className="text-muted-foreground" />
        <span className="sidebar-collapsible-item">
          Nuova chat
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function RecentChats() {
  const { conversationId } = useChat();
  const { data, error, isLoading, refetch } = useListChatsQuery();

  const recent = useMemo(
    () => newestFirst(data ?? []).slice(0, MAX_RECENT_CHATS),
    [data],
  );

  return (
    <SidebarGroup className="sidebar-collapsible-item">
      <SidebarGroupLabel>Chat recenti</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading && (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          )}
          {error && !data && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => refetch()}>
                <span>Errore nel caricamento. Riprova</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {recent.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                isActive={chat.id === conversationId}
                render={<Link href={`/chat/${chat.id}`} />}
              >
                <MessageSquare className="text-muted-foreground" />
                <span>{chat.query}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
