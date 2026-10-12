"use client";

import {
  Bubble,
  BubbleContent,
} from "@/components/ui/bubble";
import { HTMLRenderer } from "@/components/ui/HTMLRenderer";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Message,
  MessageContent,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { useChat } from "@/context/ChatContext";
import { act_UploadDocuments } from "@/lib/actions/documents";
import {
  ChatSchema,
  TChatSchema,
} from "@/lib/schemas/ChatSchema";
import {
  PDFSchema,
  TPDFSchema,
} from "@/lib/schemas/PDFSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send } from "lucide-react";
import {
  ChangeEvent,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
} from "react";
import { Controller, useForm } from "react-hook-form";

function Page() {
  const {
    messages,
    isStreaming,
    sendMessage,
    error: ChatError,
  } = useChat();

  const [uploadState, UPLOAD, isUploadPending] =
    useActionState(act_UploadDocuments, null);

  const {
    handleSubmit: handlePDFSubmit,
    setValue: setPDFValue,
    register: registerPDFInput,
  } = useForm<TPDFSchema>({
    resolver: zodResolver(PDFSchema),
  });

  const {
    handleSubmit: handleChatSubmit,
    control: ChatControl,
  } = useForm<TChatSchema>({
    resolver: zodResolver(ChatSchema),
  });

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      const files = Array.from(fileList ?? []);

      setPDFValue("files", files, {
        shouldValidate: true,
        shouldDirty: true,
      });

      const form = e.target.form;
      if (form) {
        console.log(form);
        form.requestSubmit();
      }
    },
    [setPDFValue],
  );

  const PDFSubmit = async (files: TPDFSchema) => {
    console.log(files);
    console.log("pdf submit");
    startTransition(() => {
      UPLOAD(files as TPDFSchema);
    });
  };

  const ChatSubmit = async (data: TChatSchema) => {
    await sendMessage(data.query);
  };

  useEffect(() => {
    console.log(uploadState);
    console.log(ChatError);
    console.log(messages);
  }, [uploadState, ChatError, messages]);

  return (
    <div className="w-full min-h-full grid grid-cols-[1fr_2fr_1fr]">
      <div className="col-[2/span_1] flex justify-center items-center">
        <div className="flex flex-col gap-6 pb-4 w-full h-screen">
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport className="scrollbar-none">
                <MessageScrollerContent
                  aria-busy={isStreaming}
                  className="flex flex-col min-h-full justify-end"
                >
                  {messages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id.toString()}
                      //scrollAnchor={message.role === "user"}
                    >
                      <Message
                        align={
                          message.role === "user"
                            ? "end"
                            : "start"
                        }
                        className="block"
                      >
                        <MessageContent>
                          <Bubble
                            align={
                              message.role === "user"
                                ? "end"
                                : "start"
                            }
                            variant={
                              message.role === "user"
                                ? "tinted"
                                : "secondary"
                            }
                          >
                            <BubbleContent>
                              <HTMLRenderer
                                html={message.content}
                              />
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
            <InputGroup className="w-full">
              <form
                id="chat-form"
                onSubmit={handleChatSubmit(ChatSubmit)}
                noValidate
                className="w-full"
              >
                <Controller
                  name="query"
                  control={ChatControl}
                  render={({ field, fieldState }) => (
                    <InputGroupInput
                      {...field}
                      id={field.name}
                      placeholder="Chiedimi qualcosa"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      required
                      className="w-full"
                    />
                  )}
                />
                <button type="submit" className="hidden">
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
                >
                  <Send />
                </InputGroupButton>
              </InputGroupAddon>

              <InputGroupAddon>
                <form
                  id="PDFForm"
                  onSubmit={handlePDFSubmit(PDFSubmit)}
                  noValidate
                  encType="multipart/form-data"
                >
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    render={
                      <label
                        htmlFor="files"
                        className="cursor-pointer"
                        title="Carica file"
                      />
                    }
                    className="rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                    <input
                      {...registerPDFInput("files", {
                        onChange: handleFileChange,
                      })}
                      id={"files"}
                      type="file"
                      multiple
                      className="sr-only"
                    />
                  </InputGroupButton>
                </form>
              </InputGroupAddon>
            </InputGroup>
          </MessageScrollerProvider>
        </div>
      </div>
    </div>
  );
}

export default Page;
