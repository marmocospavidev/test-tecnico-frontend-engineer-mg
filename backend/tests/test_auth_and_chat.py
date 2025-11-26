import json
from typing import List

from fastapi.testclient import TestClient

from src.utils import PDF_DIR


def test_login_sets_cookie(client: TestClient):
    response = client.post("/api/auth/login", json={"user_id": "alice"})
    assert response.status_code == 200
    assert response.json()["user_id"] == "alice"
    assert response.cookies.get("user_id") == "alice"


def test_login_empty_user_id_rejected(client: TestClient):
    """Login con user_id vuoto deve restituire 422."""
    response = client.post("/api/auth/login", json={"user_id": ""})
    assert response.status_code == 422
    assert "detail" in response.json()


def test_login_whitespace_only_user_id_rejected(client: TestClient):
    """Login con user_id contenente solo spazi deve restituire 422."""
    response = client.post("/api/auth/login", json={"user_id": "   "})
    assert response.status_code == 422


def test_login_user_id_too_long_rejected(client: TestClient):
    """Login con user_id > 100 caratteri deve restituire 422."""
    long_id = "a" * 101
    response = client.post("/api/auth/login", json={"user_id": long_id})
    assert response.status_code == 422


def test_login_invalid_characters_rejected(client: TestClient):
    """Login con caratteri non validi in user_id deve restituire 422."""
    response = client.post("/api/auth/login", json={"user_id": "user@email.com"})
    assert response.status_code == 422

    response = client.post("/api/auth/login", json={"user_id": "user with spaces"})
    assert response.status_code == 422


def test_protected_chat_requires_auth(client: TestClient):
    response = client.post("/api/chat/", json={"query": "ciao"})
    assert response.status_code == 401


def test_chat_empty_query_returns_400(authed_client: TestClient):
    response = authed_client.post("/api/chat/", json={"query": "   "})
    assert response.status_code == 400
    assert response.json()["detail"] == "Query must not be empty."


def test_chat_query_too_long_rejected(authed_client: TestClient):
    """Query > 10000 caratteri deve restituire 400."""
    long_query = "a" * 10001
    response = authed_client.post("/api/chat/", json={"query": long_query})
    assert response.status_code == 400
    assert "too long" in response.json()["detail"].lower()


def test_list_chats_invalid_pagination(authed_client: TestClient):
    """Pagination con parametri invalidi deve restituire 400."""
    # limit troppo piccolo
    response = authed_client.get("/api/chat/?limit=0")
    assert response.status_code == 400
    assert "limit" in response.json()["detail"]

    # limit troppo grande
    response = authed_client.get("/api/chat/?limit=101")
    assert response.status_code == 400

    # offset negativo
    response = authed_client.get("/api/chat/?offset=-1")
    assert response.status_code == 400
    assert "offset" in response.json()["detail"]


def test_list_chats_valid_pagination(authed_client: TestClient):
    """Pagination valida deve funzionare correttamente."""
    response = authed_client.get("/api/chat/?limit=10&offset=0")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def _upload_valid_document(authed_client: TestClient) -> str:
    """
    Helper: carica un PDF reale da data/pdfs e restituisce il suo id.
    """
    pdf_files = list(PDF_DIR.glob("*.pdf"))
    assert pdf_files, "Nessun PDF presente in data/pdfs per il test."
    file_path = pdf_files[0]

    with file_path.open("rb") as f:
        files = {
            "files": (file_path.name, f, "application/pdf"),
        }
        response = authed_client.post("/api/documents/", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["documents"], "La risposta deve contenere almeno un documento."
    return data["documents"][0]["id"]


def test_chat_streaming_and_history_with_document(authed_client: TestClient):
    """
    Smoke test end-to-end:
    - upload documento valido
    - chiamata alla chat con streaming NDJSON
    - verifica chunk di content + citations
    - verifica che la chat finisca in /api/chat/ e sia recuperabile via /api/chat/{id}
    """
    _upload_valid_document(authed_client)

    response = authed_client.post("/api/chat/", json={"query": "Riassumi il documento"})
    assert response.status_code == 200

    lines: List[str] = [line for line in response.text.splitlines() if line.strip()]
    assert lines, "La risposta della chat deve contenere almeno una riga."

    content_chunks = []
    citations_chunk = None

    for line in lines:
        payload = json.loads(line)
        if payload.get("type") == "content":
            content_chunks.append(payload)
        elif payload.get("type") == "citations":
            citations_chunk = payload

    assert content_chunks, "Devono essere presenti chunk di tipo 'content'."
    assert citations_chunk is not None, (
        "Deve essere presente un chunk di tipo 'citations'."
    )

    references = citations_chunk["references"]
    assert references, "Le citations devono contenere almeno un riferimento."

    # Verifica struttura bounding box
    for ref in references:
        bbox = ref.get("bounding_box")
        assert isinstance(bbox, list) and len(bbox) == 4
        for value in bbox:
            assert 0.0 <= value <= 1.0

    # Verifica che la history contenga almeno una chat
    history_resp = authed_client.get("/api/chat/")
    assert history_resp.status_code == 200
    chats = history_resp.json()
    assert chats, "La history deve contenere almeno una chat."

    chat_id = chats[0]["id"]
    detail_resp = authed_client.get(f"/api/chat/{chat_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == chat_id
    assert "query" in detail and "response" in detail
