"use client";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { HTMLRenderer } from "@/components/ui/HTMLRenderer";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useChat } from "@/context/ChatContext";
import { ChatSchema, TChatSchema } from "@/lib/schemas/ChatSchema";
import type { ChatMessage } from "@/lib/types/chat";
import { MessageSources } from "./MessageSources";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send } from "lucide-react";
import { ChangeEvent, memo, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";

// I messaggi consolidati non cambiano mai, quindi la memoizzazione li tiene
// fuori dai re-render causati da ogni delta dello streaming.
const MessageRow = memo(function MessageRow({
  message,
}: {
  message: ChatMessage;
}) {
  const align = message.role === "user" ? "end" : "start";
  // Una richiesta fallita lascia un messaggio dell'assistant vuoto: si mostra
  // solo la sua nota di stato, non una bolla vuota.
  const hasBody =
    message.status === "pending" ||
    message.content !== "" ||
    message.type === "document";
  const isAssistantContent =
    message.type === "content" && message.role === "assistant";

  return (
    <MessageScrollerItem messageId={message.id.toString()}>
      <Message align={align} className="block">
        <MessageContent>
          {hasBody && (
            <Bubble
              align={align}
              variant={message.role === "user" ? "tinted" : "secondary"}
            >
              <BubbleContent>
                {message.status === "pending" ? (
                  <span
                    role="status"
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Spinner />
                    Sto generando la risposta…
                  </span>
                ) : (
                  <HTMLRenderer html={message.content} />
                )}
                {message.type === "document" && (
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {message.documents.map((document) => (
                      <li key={document.id}>{document.filename}</li>
                    ))}
                  </ul>
                )}
                {isAssistantContent &&
                  message.status === "complete" &&
                  message.references &&
                  message.references.length > 0 && (
                    <MessageSources references={message.references} />
                  )}
              </BubbleContent>
            </Bubble>
          )}
          {message.status === "streaming" && (
            <p
              role="status"
              className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Generazione in corso
            </p>
          )}
          {message.status === "error" && (
            <p className="mt-1 text-xs text-destructive">
              Risposta non completata
            </p>
          )}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
});

function ConversationSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-label="Caricamento della conversazione"
    >
      <Skeleton className="h-10 w-1/2 self-end" />
      <Skeleton className="h-24 w-3/4" />
    </div>
  );
}

export function ChatView() {
  const {
    messages,
    streamingMessage,
    isStreaming,
    isLoadingConversation,
    conversationError,
    error,
    isUploading,
    uploadError,
    sendMessage,
    uploadFiles,
    retryConversation,
  } = useChat();

  const { handleSubmit, control, reset } = useForm<TChatSchema>({
    resolver: zodResolver(ChatSchema),
    defaultValues: { query: "" },
  });

  const isBlocked = isLoadingConversation || conversationError !== null;
  // Un'operazione alla volta: richieste di chat e upload si escludono a vicenda.
  const canSend = !isBlocked && !isStreaming && !isUploading;
  const canUpload = !isStreaming && !isUploading;

  const onSubmit = async ({ query }: TChatSchema) => {
    // Invio non consentito: Invio non deve scartare il testo.
    if (!canSend) return;

    reset({ query: "" });
    await sendMessage(query);
  };

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const files = Array.from(input.files ?? []);

      // Permette di selezionare di nuovo lo stesso file.
      input.value = "";

      if (files.length > 0) void uploadFiles(files);
    },
    [uploadFiles],
  );

  const chatError = error
    ? `${
        error.kind === "request"
          ? "Richiesta non riuscita"
          : "Streaming interrotto"
      }: ${error.message}`
    : null;
  const feedback = chatError ?? uploadError;

  return (
    <div className="mx-auto h-full w-full max-w-3xl px-3 sm:px-4">
      <div className="flex h-full min-h-0 flex-col gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:pb-4">
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport className="scrollbar-none">
                <MessageScrollerContent
                  aria-busy={isStreaming || isLoadingConversation}
                  className="flex flex-col min-h-full justify-end"
                >
                  {isLoadingConversation ? (
                    <ConversationSkeleton />
                  ) : (
                    <>
                      {messages.map((message) => (
                        <MessageRow key={message.id} message={message} />
                      ))}
                      {streamingMessage && (
                        <MessageRow
                          key={streamingMessage.id}
                          message={streamingMessage}
                        />
                      )}
                    </>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
            {conversationError && (
              <Alert variant="error">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {`Impossibile caricare la conversazione: ${conversationError}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryConversation}
                  >
                    Riprova
                  </Button>
                </div>
              </Alert>
            )}
            {feedback && <Alert variant="error">{feedback}</Alert>}
            {isUploading && (
              <Alert variant="info">
                <span className="flex items-center gap-2">
                  <Spinner />
                  Caricamento dei documenti in corso…
                </span>
              </Alert>
            )}
            <InputGroup className="w-full">
              <form
                id="chat-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="w-full"
              >
                <Controller
                  name="query"
                  control={control}
                  render={({ field, fieldState }) => (
                    <InputGroupInput
                      {...field}
                      id={field.name}
                      placeholder="Chiedimi qualcosa"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      disabled={isBlocked}
                      required
                      className="w-full md:text-base"
                    />
                  )}
                />
                <button type="submit" className="hidden" disabled={!canSend}>
                  Invia
                </button>
              </form>
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  type="submit"
                  variant="ghost"
                  className="rounded-full"
                  form="chat-form"
                  disabled={!canSend}
                  aria-label="Invia"
                >
                  <Send />
                </InputGroupButton>
              </InputGroupAddon>

              <InputGroupAddon>
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  nativeButton={false}
                  render={
                    <label
                      htmlFor="files"
                      className="cursor-pointer aria-disabled:pointer-events-none aria-disabled:opacity-50"
                      title="Carica file"
                      aria-disabled={!canUpload}
                    />
                  }
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4" />
                  <input
                    id="files"
                    name="files"
                    type="file"
                    accept="application/pdf"
                    multiple
                    disabled={!canUpload}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </MessageScrollerProvider>
        </div>
    </div>
  );
}
