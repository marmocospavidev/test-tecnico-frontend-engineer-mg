from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

import fitz  # PyMuPDF
from PIL import Image, ImageDraw


# Paths (resolved from this test file location)
BACKEND_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_ROOT / "data"
PDF_DIR = DATA_DIR / "pdfs"
BBOX_JSON_PATH = DATA_DIR / "mock_qa_bbox" / "bbox.json"
OUTPUT_DIR = DATA_DIR / "bbox_visualization_output"

# DPI used to rasterize the PDF pages.
# BBoxes are expressed in inches; 1 inch will correspond to `DPI` pixels.
DPI = 144


def _load_bounding_boxes(
    bbox_path: Path = BBOX_JSON_PATH,
) -> Dict[Tuple[str, int], List[Tuple[float, float, float, float]]]:
    """
    Parse bbox.json and group bounding boxes by (pdf_filename, page_number).

    The structure in bbox.json is a flat list of bbox entries with pre-computed
    (x, y, w, h) format in inches:
    [
        {
            "page": 2,
            "bounding_regions": [
                {
                    "page_number": 2,
                    "rects_in": [[x, y, w, h], ...]
                },
                ...
            ],
            "filename": "attention_is_all_you_need.pdf",
            "sha": "..."
        },
        ...
    ]

    Coordinates are in inches measured from the top‑left corner of the page,
    with `y` increasing downward. We convert inches -> pixels using the chosen DPI.
    """
    with bbox_path.open("r", encoding="utf-8") as f:
        items = json.load(f)

    boxes_by_doc_page: Dict[Tuple[str, int], List[Tuple[float, float, float, float]]] = (
        defaultdict(list)
    )

    for item in items:
        filename = item.get("filename")
        if not filename:
            continue

        for region in item.get("bounding_regions", []):
            if not region:
                continue

            page_number = region.get("page_number")
            rects_in = region.get("rects_in", [])

            for rect in rects_in:
                if len(rect) != 4:
                    continue

                x_in, y_in, w_in, h_in = rect

                # Convert from inches to pixels
                x_px = x_in * DPI
                y_px = y_in * DPI
                w_px = w_in * DPI
                h_px = h_in * DPI

                # Pillow rectangles are specified as (left, top, right, bottom)
                left = x_px
                top = y_px
                right = x_px + w_px
                bottom = y_px + h_px

                boxes_by_doc_page[(filename, page_number)].append((left, top, right, bottom))

    return boxes_by_doc_page


def render_bboxes_to_images(
    dpi: int = DPI,
    output_dir: Path = OUTPUT_DIR,
) -> None:
    """
    Render each referenced PDF page as a PNG and draw its bounding boxes.

    Output files are written to `backend/data/bbox_visualization_output` as:
    <pdf_stem>_page_<page>_bboxes.png
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    boxes_by_doc_page = _load_bounding_boxes()
    if not boxes_by_doc_page:
        print(f"No bounding boxes found in {BBOX_JSON_PATH}")
        return

    print(f"Loaded bounding boxes for {len(boxes_by_doc_page)} (pdf, page) pairs.")

    # Cache open documents per filename so we don't reopen the same PDF repeatedly.
    open_docs: Dict[str, fitz.Document] = {}
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)

    try:
        for (pdf_filename, page_number), rects in boxes_by_doc_page.items():
            pdf_path = PDF_DIR / pdf_filename
            if not pdf_path.exists():
                print(f"[WARN] PDF not found for bboxes: {pdf_path}")
                continue

            doc = open_docs.get(pdf_filename)
            if doc is None:
                doc = fitz.open(pdf_path)
                open_docs[pdf_filename] = doc

            page_index = page_number - 1  # bbox.json uses 1‑based pages
            if page_index < 0 or page_index >= doc.page_count:
                print(
                    f"[WARN] Invalid page {page_number} for {pdf_filename} "
                    f"(document has {doc.page_count} pages)"
                )
                continue

            page = doc[page_index]
            pix = page.get_pixmap(matrix=matrix)

            mode = "RGBA" if pix.alpha else "RGB"
            img = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
            draw = ImageDraw.Draw(img)

            for (left, top, right, bottom) in rects:
                draw.rectangle((left, top, right, bottom), outline="red", width=3)

            out_name = f"{pdf_path.stem}_page_{page_number}_bboxes.png"
            out_path = output_dir / out_name
            img.save(out_path)
            print(f"Saved: {out_path}")
    finally:
        for doc in open_docs.values():
            doc.close()


if __name__ == "__main__":
    """
    Run this file directly to generate PNGs with drawn bounding boxes.

    Example (from the backend project root):

        uv run python -m tests.bbox_visualization

    The resulting images will be written under:
        backend/data/bbox_visualization_output/
    """
    render_bboxes_to_images()


