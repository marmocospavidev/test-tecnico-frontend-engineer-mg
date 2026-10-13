import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStreamLine, readLines } from "./stream.ts";

function streamOf(...chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>) {
  const lines: string[] = [];
  await readLines(body, (line) => lines.push(line));
  return lines;
}

const encode = (text: string) => new TextEncoder().encode(text);

describe("readLines", () => {
  it("reassembles lines split across chunks", async () => {
    const lines = await collect(
      streamOf(encode('{"a":'), encode('1}\n{"b"'), encode(":2}\n")),
    );

    assert.deepEqual(lines, ['{"a":1}', '{"b":2}']);
  });

  it("emits the last line when the newline is missing", async () => {
    const lines = await collect(streamOf(encode('{"a":1}\n{"b":2}')));

    assert.deepEqual(lines, ['{"a":1}', '{"b":2}']);
  });

  it("keeps multi-byte characters split between chunks", async () => {
    const bytes = encode('{"delta":"€"}\n');
    const euro = bytes.indexOf(0xe2);

    const lines = await collect(
      streamOf(bytes.slice(0, euro + 1), bytes.slice(euro + 1)),
    );

    assert.deepEqual(lines, ['{"delta":"€"}']);
  });

  it("skips blank lines", async () => {
    const lines = await collect(streamOf(encode('\n{"a":1}\n\n  \n')));

    assert.deepEqual(lines, ['{"a":1}']);
  });
});

describe("parseStreamLine", () => {
  it("parses the events of the protocol", () => {
    assert.deepEqual(
      parseStreamLine('{"type":"content","delta":"ciao"}'),
      { type: "content", delta: "ciao" },
    );
    assert.deepEqual(
      parseStreamLine('{"type":"citations","references":[]}'),
      { type: "citations", references: [] },
    );
    assert.deepEqual(
      parseStreamLine('{"type":"error","message":"boom"}'),
      { type: "error", message: "boom" },
    );
  });

  it("rejects malformed JSON", () => {
    assert.throws(() => parseStreamLine('{"type":"content"'), {
      message: "Risposta dello stream non valida",
    });
  });

  it("rejects unknown or incomplete events", () => {
    assert.throws(() => parseStreamLine('{"type":"other"}'));
    assert.throws(() => parseStreamLine('{"type":"content"}'));
    assert.throws(() => parseStreamLine("null"));
  });
});
