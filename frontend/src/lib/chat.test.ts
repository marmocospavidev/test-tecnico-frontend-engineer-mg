import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCreatedChat, newestFirst, toHistory, uniqueFiles } from "./chat.ts";
import type { APIChat } from "./types/api";
import type { ChatMessage } from "./types/chat";

const chat = (id: string, created_at: string, query = "q", response = "r"): APIChat => ({
  id,
  user_id: "u",
  created_at,
  query,
  response,
});

describe("findCreatedChat", () => {
  it("picks the newest chat matching the exchange", () => {
    const chats = [
      chat("old", "2026-01-01T10:00:00", "ciao", "risposta"),
      chat("other", "2026-01-03T10:00:00", "altro", "risposta"),
      chat("new", "2026-01-02T10:00:00", "ciao", "risposta"),
    ];

    assert.equal(
      findCreatedChat(chats, { query: "ciao", response: "risposta" })?.id,
      "new",
    );
  });

  it("returns undefined when the chat is not listed yet", () => {
    assert.equal(
      findCreatedChat([chat("a", "2026-01-01T10:00:00")], {
        query: "x",
        response: "y",
      }),
      undefined,
    );
  });
});

describe("newestFirst", () => {
  it("sorts without mutating the input", () => {
    const input = [chat("a", "2026-01-01"), chat("b", "2026-01-02")];

    assert.deepEqual(newestFirst(input).map((c) => c.id), ["b", "a"]);
    assert.deepEqual(input.map((c) => c.id), ["a", "b"]);
  });
});

describe("toHistory", () => {
  it("keeps only successful text messages", () => {
    const messages: ChatMessage[] = [
      { type: "content", id: 0, role: "user", content: "q1", status: "complete" },
      { type: "content", id: 1, role: "assistant", content: "a1", status: "complete" },
      { type: "document", id: 2, role: "assistant", content: "up", documents: [], status: "complete" },
      { type: "content", id: 3, role: "user", content: "q2", status: "complete" },
      { type: "content", id: 4, role: "assistant", content: "par", status: "error" },
    ];

    assert.deepEqual(toHistory(messages), [
      { role: "user", content: "q1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "q2" },
    ]);
  });
});

describe("uniqueFiles", () => {
  it("drops duplicates within a selection", () => {
    const a = new File(["aa"], "a.pdf", { lastModified: 1 });
    const again = new File(["aa"], "a.pdf", { lastModified: 1 });
    const b = new File(["b"], "b.pdf", { lastModified: 1 });

    assert.deepEqual(uniqueFiles([a, again, b]), [a, b]);
  });
});
