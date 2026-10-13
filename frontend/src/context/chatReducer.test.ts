import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chatReducer,
  initialChatState,
  type ChatAction,
  type ChatState,
} from "./chatReducer.ts";
import type { APIChat, Document } from "../lib/types/api";

function run(actions: ChatAction[], from: ChatState = initialChatState) {
  return actions.reduce(chatReducer, from);
}

const stored: APIChat = {
  id: "c1",
  user_id: "u",
  created_at: "2026-01-01T10:00:00",
  query: "domanda",
  response: "risposta",
  citations: [
    {
      document_id: "d",
      filename: "f.pdf",
      page_number: 1,
      text_quote: "t",
      bounding_regions: [],
    },
  ],
};

const doc = (id: string): Document => ({
  id,
  filename: `${id}.pdf`,
  content_type: "application/pdf",
  upload_date: "2026-01-01",
  status: "ingested",
  page_count: 1,
  file_hash: id,
});

describe("streaming", () => {
  it("creates an empty pending assistant message when a query is sent", () => {
    const state = run([{ type: "message/sent", query: "ciao" }]);

    assert.deepEqual(
      [state.draft?.content, state.draft?.status],
      ["", "pending"],
    );
    assert.equal(state.messages.length, 1);
  });

  it("moves to streaming on the first delta, not before", () => {
    const sent = run([{ type: "message/sent", query: "ciao" }]);
    const streaming = chatReducer(sent, {
      type: "stream/delta",
      epoch: 0,
      text: "C",
    });

    assert.equal(sent.draft?.status, "pending");
    assert.equal(streaming.draft?.status, "streaming");
  });

  it("reports a failure before any content as a request error", () => {
    const state = run([
      { type: "message/sent", query: "ciao" },
      { type: "stream/failed", epoch: 0, message: "500" },
    ]);

    assert.deepEqual(state.error, { kind: "request", message: "500" });
    assert.equal(state.messages[1].status, "error");
  });

  it("blocks sending while an upload is running", () => {
    const uploading = run([{ type: "upload/started" }]);

    assert.equal(
      chatReducer(uploading, { type: "message/sent", query: "x" }),
      uploading,
    );
  });

  it("blocks uploads while a chat request is active", () => {
    const sent = run([{ type: "message/sent", query: "x" }]);

    assert.equal(chatReducer(sent, { type: "upload/started" }), sent);
  });

  it("appends deltas to the draft without touching committed messages", () => {
    const sent = run([{ type: "message/sent", query: "ciao" }]);
    const streaming = run(
      [
        { type: "stream/delta", epoch: 0, text: "Ci" },
        { type: "stream/delta", epoch: 0, text: "ao" },
      ],
      sent,
    );

    assert.equal(streaming.draft?.content, "Ciao");
    assert.equal(streaming.messages, sent.messages);
    assert.equal(streaming.messages.length, 1);
  });

  it("commits the draft on completion", () => {
    const state = run([
      { type: "message/sent", query: "ciao" },
      { type: "stream/delta", epoch: 0, text: "Ciao" },
      { type: "stream/completed", epoch: 0 },
    ]);

    assert.equal(state.draft, null);
    assert.deepEqual(
      state.messages.map((m) => [m.role, m.content, m.status]),
      [
        ["user", "ciao", "complete"],
        ["assistant", "Ciao", "complete"],
      ],
    );
  });

  it("keeps the partial reply and exposes the error on failure", () => {
    const state = run([
      { type: "message/sent", query: "ciao" },
      { type: "stream/delta", epoch: 0, text: "Cia" },
      { type: "stream/failed", epoch: 0, message: "rete" },
    ]);

    assert.equal(state.draft, null);
    assert.deepEqual(state.error, { kind: "stream", message: "rete" });
    assert.equal(state.messages[1].content, "Cia");
    assert.equal(state.messages[1].status, "error");
  });

  it("clears the previous error when a new message is sent", () => {
    const failed = run([
      { type: "message/sent", query: "a" },
      { type: "stream/failed", epoch: 0, message: "rete" },
    ]);

    assert.equal(run([{ type: "message/sent", query: "b" }], failed).error, null);
  });

  it("ignores a second send while streaming", () => {
    const first = run([{ type: "message/sent", query: "a" }]);

    assert.equal(chatReducer(first, { type: "message/sent", query: "b" }), first);
  });

  it("drops stream actions of a previous conversation", () => {
    const state = run([
      { type: "message/sent", query: "a" },
      { type: "conversation/opened", id: "c1" },
      { type: "stream/delta", epoch: 0, text: "stale" },
      { type: "stream/references", epoch: 0, references: [] },
      { type: "stream/completed", epoch: 0 },
      { type: "stream/failed", epoch: 0, message: "stale" },
    ]);

    assert.equal(state.epoch, 1);
    assert.deepEqual(state.messages, []);
    assert.equal(state.error, null);
  });

  it("stores references on the draft", () => {
    const state = run([
      { type: "message/sent", query: "a" },
      { type: "stream/references", epoch: 0, references: stored.citations! },
      { type: "stream/completed", epoch: 0 },
    ]);

    assert.deepEqual(state.messages[1].references, stored.citations);
  });
});

describe("conversations", () => {
  it("loads an existing conversation into messages", () => {
    const state = run([
      { type: "conversation/opened", id: "c1" },
      { type: "conversation/loaded", epoch: 1, chat: stored },
    ]);

    assert.equal(state.load.status, "idle");
    assert.deepEqual(
      state.messages.map((m) => [m.role, m.content]),
      [
        ["user", "domanda"],
        ["assistant", "risposta"],
      ],
    );
    assert.deepEqual(state.messages[1].references, stored.citations);
    assert.equal(new Set(state.messages.map((m) => m.id)).size, 2);
  });

  it("clears the previous messages as soon as another chat is opened", () => {
    const state = run([
      { type: "conversation/opened", id: "c1" },
      { type: "conversation/loaded", epoch: 1, chat: stored },
      { type: "conversation/opened", id: "c2" },
    ]);

    assert.deepEqual(state.messages, []);
    assert.equal(state.load.status, "loading");
  });

  it("ignores a response that belongs to a previous conversation", () => {
    const state = run([
      { type: "conversation/opened", id: "c1" },
      { type: "conversation/opened", id: "c2" },
      { type: "conversation/loaded", epoch: 1, chat: stored },
    ]);

    assert.deepEqual(state.messages, []);
    assert.equal(state.load.status, "loading");
  });

  it("does not load a chat whose id differs from the open one", () => {
    const state = run([
      { type: "conversation/opened", id: "c2" },
      { type: "conversation/loaded", epoch: 1, chat: stored },
    ]);

    assert.deepEqual(state.messages, []);
  });

  it("is idempotent when the same chat is opened again", () => {
    const opened = run([{ type: "conversation/opened", id: "c1" }]);

    assert.equal(chatReducer(opened, { type: "conversation/opened", id: "c1" }), opened);
  });

  it("records load failures without leaving the chat loading", () => {
    const state = run([
      { type: "conversation/opened", id: "c1" },
      { type: "conversation/loadFailed", epoch: 1, message: "404" },
    ]);

    assert.deepEqual(state.load, { status: "error", error: "404" });
  });

  it("retries a failed conversation load", () => {
    const failed = run([
      { type: "conversation/opened", id: "c1" },
      { type: "conversation/loadFailed", epoch: 1, message: "404" },
    ]);

    assert.deepEqual(
      chatReducer(failed, { type: "conversation/retried" }).load,
      { status: "loading", error: null },
    );
  });

  it("blocks sending while a conversation is loading", () => {
    const loading = run([{ type: "conversation/opened", id: "c1" }]);

    assert.equal(chatReducer(loading, { type: "message/sent", query: "x" }), loading);
  });

  it("adopts the id of a created chat without resetting the messages", () => {
    const state = run([
      { type: "message/sent", query: "a" },
      { type: "stream/delta", epoch: 0, text: "r" },
      { type: "stream/completed", epoch: 0 },
      { type: "conversation/created", epoch: 0, id: "c9" },
      { type: "conversation/opened", id: "c9" },
    ]);

    assert.equal(state.conversationId, "c9");
    assert.equal(state.epoch, 0);
    assert.equal(state.messages.length, 2);
  });

  it("resets an unsaved conversation when a new chat is requested", () => {
    const state = run([
      { type: "message/sent", query: "a" },
      { type: "conversation/opened", id: null },
    ]);

    assert.deepEqual(state.messages, []);
    assert.equal(state.draft, null);
  });

  it("does nothing when a new chat is requested on a pristine state", () => {
    assert.equal(
      chatReducer(initialChatState, { type: "conversation/opened", id: null }),
      initialChatState,
    );
  });
});

describe("upload", () => {
  it("adds one document message and settles the upload", () => {
    const state = run([
      { type: "upload/started" },
      { type: "upload/succeeded", inConversation: true, epoch: 0, message: "ok", documents: [doc("a"), doc("b")] },
    ]);

    assert.deepEqual(state.upload, { status: "idle", error: null });
    assert.equal(state.messages.length, 1);
    assert.equal(state.messages[0].type, "document");
  });

  it("does not duplicate documents that are already listed", () => {
    const first = run([
      { type: "upload/succeeded", inConversation: true, epoch: 0, message: "ok", documents: [doc("a")] },
    ]);
    const second = run(
      [
        {
          type: "upload/succeeded",
          inConversation: true,
          epoch: 0,
          message: "ok",
          documents: [doc("a"), doc("b")],
        },
        { type: "upload/succeeded", inConversation: true, epoch: 0, message: "ok", documents: [doc("b")] },
      ],
      first,
    );

    const documents = second.messages.flatMap((m) =>
      m.type === "document" ? m.documents.map((d) => d.id) : [],
    );

    assert.deepEqual(documents, ["a", "b"]);
  });

  it("settles but adds nothing when the conversation changed", () => {
    const state = run([
      { type: "upload/started" },
      { type: "conversation/opened", id: "c1" },
      { type: "upload/succeeded", inConversation: true, epoch: 0, message: "ok", documents: [doc("a")] },
    ]);

    assert.equal(state.upload.status, "idle");
    assert.deepEqual(state.messages, []);
  });

  it("settles but adds nothing when the upload is not announced in the chat", () => {
    const state = run([
      { type: "upload/started" },
      { type: "upload/succeeded", epoch: 0, inConversation: false, message: "ok", documents: [doc("a")] },
    ]);

    assert.equal(state.upload.status, "idle");
    assert.deepEqual(state.messages, []);
  });

  it("keeps messages intact on failure and reports the error", () => {
    const state = run([
      { type: "message/sent", query: "a" },
      { type: "upload/failed", message: "non valido" },
    ]);

    assert.equal(state.messages.length, 1);
    assert.deepEqual(state.upload, { status: "idle", error: "non valido" });
  });
});
