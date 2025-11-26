import asyncio
import json
import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.dependencies import MockDatabase, get_current_user, get_db
from src.utils import ALLOWED_FILE_HASHES

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    history: Optional[List[dict]] = (
        None  # List of {"role": "user"|"assistant", "content": "..."}
    )


# Mock content for generation, deliberately containing Markdown and HTML
MOCK_RESPONSES = [
    """
## Analisi del documento

Di seguito una sintesi in formato **Markdown**:

- **Oggetto**: Contratto di fornitura
- **Parti coinvolte**: Cliente, Fornitore
- **Sezioni chiave**:
  1. Introduzione
  2. Termini economici
  3. Clausole di riservatezza

| Voce   | Valore      |
|--------|-------------|
| Importo| 10.000 €    |
| Scadenza | 31/12/2025 |

Esempio di snippet HTML:

<table>
  <tr><th>Campo</th><th>Valore</th></tr>
  <tr><td>Stato</td><td><strong>Approvato</strong></td></tr>
</table>
""",
    """
### Riepilogo del report trimestrale

I punti principali sono:

- Ricavi in crescita del **15%** rispetto al trimestre precedente
- Margine operativo lordo stabile
- Riduzione dei costi fissi grazie all'automazione

Snippet HTML per una lista non ordinata:
<ul>
  <li><strong>Area</strong>: Vendite</li>
  <li><strong>Periodo</strong>: Q1 2025</li>
  <li><strong>Note</strong>: Dati preliminari</li>
</ul>
""",
    """
### Verifica di conformità

Secondo le linee guida di sicurezza:

1. Tutti i dati sensibili devono essere cifrati **at rest** e **in transit**.
2. Gli accessi devono essere tracciati con un sistema di **audit log**.

Tabella HTML di esempio:
<table>
  <tr><th>Requisito</th><th>Stato</th></tr>
  <tr><td>Cifratura dati</td><td><strong>OK</strong></td></tr>
  <tr><td>Audit log</td><td><strong>In corso</strong></td></tr>
</table>
""",
]


# Path to bbox.json (resolve from this file location)
BBOX_JSON_PATH = Path(__file__).resolve().parents[2] / "data" / "mock_qa_bbox" / "bbox.json"

# Type aliases
# A citation entry: {"page": int, "bounding_regions": List[{"page_number": int, "rects_in": List[List[float]]}]}
CitationEntry = Dict[str, object]


def _load_citation_entries_by_filename(bbox_path: Path) -> Dict[str, List[CitationEntry]]:
    """
    Load bbox.json and group entries by filename.
    bbox.json is pre-computed with (x, y, w, h) format in inches.
    """
    entries_by_filename: Dict[str, List[CitationEntry]] = {}

    try:
        with bbox_path.open("r", encoding="utf-8") as f:
            items = json.load(f)
    except Exception:
        return entries_by_filename

    for item in items:
        filename = item.get("filename")
        if not filename:
            continue
        entries_by_filename.setdefault(filename, []).append(item)

    return entries_by_filename


# Preload citation entries once at import time
CITATION_ENTRIES_BY_FILENAME: Dict[str, List[CitationEntry]] = _load_citation_entries_by_filename(
    BBOX_JSON_PATH
)


async def fake_llm_stream(query: str, user_id: str, db: MockDatabase):
    """
    Generator that yields response chunks simulating an LLM stream.
    Wraps errors in proper JSON error chunks.
    """
    try:
        documents = db.get_documents()

        # Select a random response template
        full_response = random.choice(MOCK_RESPONSES)
        if not documents:
            full_response += (
                " (Note: No documents found in the knowledge base to reference.)"
            )

        # 1. Stream the text response character by character (to preserve Markdown/HTML)
        for ch in full_response:
            chunk = {"type": "content", "delta": ch}
            yield json.dumps(chunk) + "\n"
            await asyncio.sleep(0.02)  # Simulate token generation delay

        # 2. Stream citations/references if documents exist
        citations: List[Dict] = []
        if documents:
            # Build a mapping from filename -> document record
            filename_to_doc: Dict[str, Dict] = {d["filename"]: d for d in documents}

            # Restrict available entries to user-uploaded filenames
            available: List[Tuple[str, CitationEntry]] = []
            for filename, entries in CITATION_ENTRIES_BY_FILENAME.items():
                if filename in filename_to_doc and entries:
                    for entry in entries:
                        available.append((filename, entry))

            if available:
                # Sample 3-5 citation entries
                sample_count = random.randint(3, 5)

                # Group available by filename to help enforce diversity
                by_file: Dict[str, List[CitationEntry]] = {}
                for fname, entry in available:
                    by_file.setdefault(fname, []).append(entry)

                selected: List[Tuple[str, CitationEntry]] = []
                filenames = list(by_file.keys())
                random.shuffle(filenames)

                if len(filenames) >= 2:
                    # Pick one entry from two different files first
                    for fname in filenames[:2]:
                        entry = random.choice(by_file[fname])
                        selected.append((fname, entry))

                    # Fill remaining up to sample_count from the whole pool
                    remaining_pool = available.copy()
                    random.shuffle(remaining_pool)
                    for fname, entry in remaining_pool:
                        if len(selected) >= sample_count:
                            break
                        selected.append((fname, entry))
                else:
                    # Only one file available; sample from it
                    random.shuffle(available)
                    selected = available[:sample_count]

                for fname, entry in selected:
                    doc = filename_to_doc.get(fname)
                    if not doc:
                        continue
                    # Each entry has multiple bounding_regions - pass them all
                    citations.append(
                        {
                            "document_id": doc["id"],
                            "filename": fname,
                            "page_number": entry["page"],
                            "text_quote": "sample text from the document that supports the answer",
                            # Pass all bounding regions with their page numbers and rects
                            "bounding_regions": entry["bounding_regions"],
                        }
                    )

            citations_chunk = {"type": "citations", "references": citations}
            yield json.dumps(citations_chunk) + "\n"

        # 3. Store chat in mock DB
        db.add_chat(
            user_id=user_id, query=query, response=full_response, citations=citations
        )
    except Exception as e:
        # Return error in streaming format
        error_chunk = {"type": "error", "message": f"Streaming error: {str(e)}"}
        yield json.dumps(error_chunk) + "\n"


@router.post("/")
async def chat_endpoint(
    request: ChatRequest,
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Simulates a streaming chat completion.
    Returns a line-delimited JSON stream.

    Returns:
    - 400: Empty query or query too long (> 10000 characters)
    - 200: Streaming NDJSON response
    """
    # Validate query is not empty
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    # Validate query length
    if len(request.query) > 10000:
        raise HTTPException(
            status_code=400,
            detail="Query is too long. Maximum length is 10000 characters.",
        )

    user_id = current_user["id"]

    return StreamingResponse(
        fake_llm_stream(request.query, user_id=user_id, db=db),
        media_type="application/x-ndjson",
    )


@router.get("/")
async def list_chats(
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """
    Returns a (paginated) list of chats for the current user.

    Query params:
    - limit: max number of items to return (1-100, default 20)
    - offset: number of items to skip (>= 0, default 0)

    Returns 400 if pagination parameters are invalid.
    """
    # Validate pagination parameters
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")
    if offset < 0:
        raise HTTPException(status_code=400, detail="offset must be non-negative")

    user_id = current_user["id"]
    chats = [
        chat for chat in db.list_chats_for_user() if chat.get("user_id") == user_id
    ]
    return chats[offset : offset + limit]


@router.get("/{chat_id}")
async def get_chat(
    chat_id: str,
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns details for a single chat belonging to the current user.
    """
    user_id = current_user["id"]
    chat = db.get_chat(chat_id)
    if not chat or chat.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat
