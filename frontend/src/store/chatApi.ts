import {
  createApi,
  fakeBaseQuery,
} from "@reduxjs/toolkit/query/react";
import {
  getChat,
  getDocument,
  listChats,
  listDocuments,
} from "@/lib/api";
import type { APIChat, Document } from "@/lib/types/api";
import { errorMessage } from "@/lib/utils";

// Lo stato del server vive qui (in cache, deduplicato, invalidato); il
// reducer della chat tiene solo lo stato transitorio della UI della
// conversazione aperta.
// Chat e documenti non cambiano più dopo la creazione, quindi il singolo
// elemento resta in cache a lungo, mentre le liste vengono invalidate ogni
// volta che viene creato qualcosa.
export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fakeBaseQuery<string>(),
  tagTypes: ["Chats", "Documents"],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    listChats: builder.query<APIChat[], void>({
      queryFn: async (_arg, { signal }) => {
        try {
          return { data: await listChats(signal) };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
      providesTags: ["Chats"],
    }),
    getChat: builder.query<APIChat, string>({
      queryFn: async (chatId, { signal }) => {
        try {
          return { data: await getChat(chatId, signal) };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),
    listDocuments: builder.query<Document[], void>({
      queryFn: async (_arg, { signal }) => {
        try {
          return { data: await listDocuments(signal) };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
      providesTags: ["Documents"],
    }),
    getDocument: builder.query<Document, string>({
      queryFn: async (documentId, { signal }) => {
        try {
          return { data: await getDocument(documentId, signal) };
        } catch (error) {
          return { error: errorMessage(error) };
        }
      },
    }),
  }),
});

export const {
  useListChatsQuery,
  useGetChatQuery,
  useListDocumentsQuery,
  useGetDocumentQuery,
} = chatApi;
