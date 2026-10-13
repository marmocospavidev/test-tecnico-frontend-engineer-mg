import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasHighlights,
  isRect,
  pointsToInches,
  rectToPercentBox,
  rectsForPage,
  referencePage,
  type Rect,
} from "./geometry.ts";
import type { DocumentReference } from "../types/chat";

const reference = (
  overrides: Partial<DocumentReference> = {},
): DocumentReference => ({
  document_id: "d",
  filename: "f.pdf",
  page_number: 2,
  text_quote: "quote",
  bounding_regions: [
    { page_number: 2, rects_in: [[1, 2, 3, 4]] },
    { page_number: 2, rects_in: [[5, 6, 1, 1], [0, 0, 0, 1]] },
    { page_number: 3, rects_in: [[1, 1, 1, 1]] },
  ],
  ...overrides,
});

describe("rectToPercentBox", () => {
  it("expresses a rectangle in inches as a percentage of the page", () => {
    // Lettera US: 8.5in x 11in
    const box = rectToPercentBox([1.7, 2.2, 4.25, 1.1], {
      width: 8.5,
      height: 11,
    });

    const close = (actual: number, expected: number) =>
      assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

    close(box.left, 20);
    close(box.top, 20);
    close(box.width, 50);
    close(box.height, 10);
  });

  it("depends on the page size, not on any pixel scale", () => {
    const rect: Rect = [1, 1, 2, 2];
    const letter = rectToPercentBox(rect, { width: 8.5, height: 11 });
    const a4 = rectToPercentBox(rect, { width: 8.27, height: 11.69 });

    assert.notDeepEqual(letter, a4);
    assert.equal(letter.left, (1 / 8.5) * 100);
    assert.equal(a4.top, (1 / 11.69) * 100);
  });

  it("keeps rectangles inside the page", () => {
    const box = rectToPercentBox([8, 10.5, 3, 3], {
      width: 8.5,
      height: 11,
    });

    assert.ok(box.left + box.width <= 100);
    assert.ok(box.top + box.height <= 100);
    assert.deepEqual(
      rectToPercentBox([-1, -1, 3, 3], { width: 10, height: 10 }),
      { left: 0, top: 0, width: 20, height: 20 },
    );
  });
});

describe("pointsToInches", () => {
  it("uses 72 points per inch", () => {
    assert.equal(pointsToInches(612), 8.5);
    assert.equal(pointsToInches(792), 11);
  });
});

describe("rectsForPage", () => {
  it("returns every valid rectangle of the requested page", () => {
    assert.deepEqual(rectsForPage(reference(), 2), [
      [1, 2, 3, 4],
      [5, 6, 1, 1],
    ]);
    assert.deepEqual(rectsForPage(reference(), 3), [[1, 1, 1, 1]]);
    assert.deepEqual(rectsForPage(reference(), 9), []);
  });

  it("tolerates references without regions", () => {
    const broken = {
      ...reference(),
      bounding_regions: undefined,
    } as unknown as DocumentReference;

    assert.deepEqual(rectsForPage(broken, 1), []);
    assert.equal(hasHighlights(broken), false);
  });

  it("ignores malformed regions", () => {
    const malformed = reference({
      bounding_regions: [
        { page_number: 1, rects_in: [[1, 2, 3]] },
        { page_number: 1, rects_in: undefined as unknown as number[][] },
      ],
    });

    assert.deepEqual(rectsForPage(malformed, 1), []);
    assert.equal(hasHighlights(malformed), false);
  });
});

describe("referencePage", () => {
  it("prefers the page of the citation", () => {
    assert.equal(referencePage(reference({ page_number: 4 })), 4);
  });

  it("falls back to the first page with a highlight, then to 1", () => {
    assert.equal(
      referencePage(
        reference({ page_number: undefined as unknown as number }),
      ),
      2,
    );
    assert.equal(
      referencePage(
        reference({
          page_number: 0,
          bounding_regions: [],
        }),
      ),
      1,
    );
  });
});

describe("isRect", () => {
  it("requires four finite numbers and a positive size", () => {
    assert.equal(isRect([0, 0, 1, 1]), true);
    assert.equal(isRect([0, 0, 0, 1]), false);
    assert.equal(isRect([0, 0, 1]), false);
    assert.equal(isRect([0, 0, Number.NaN, 1]), false);
    assert.equal(isRect("rect"), false);
  });
});
