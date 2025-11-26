import io
from pathlib import Path

from src.utils import PDF_DIR


def test_upload_unknown_document_rejected(authed_client):
    """
    Upload di un PDF non presente in data/pdfs deve restituire 400.
    """
    file_content = b"fake pdf content that will not match any hash"
    files = {"files": ("fake.pdf", io.BytesIO(file_content), "application/pdf")}

    response = authed_client.post("/api/documents/", files=files)
    assert response.status_code == 400
    assert "not recognized" in response.json()["detail"]


def test_upload_empty_file_list_rejected(authed_client):
    """
    Upload senza file deve restituire 400.
    """
    # FastAPI gestisce automaticamente lista vuota come 422,
    # ma testiamo comunque la logica
    response = authed_client.post("/api/documents/", files=[])
    # 422 è accettabile per validazione Pydantic
    assert response.status_code in [400, 422]


def test_list_documents_requires_auth(client):
    response = client.get("/api/documents/")
    assert response.status_code == 401


def test_get_document_not_found(authed_client):
    response = authed_client.get("/api/documents/non-existing-id")
    assert response.status_code == 404


def test_list_documents_invalid_pagination(authed_client):
    """
    Pagination con parametri invalidi deve restituire 400.
    """
    # limit troppo piccolo
    response = authed_client.get("/api/documents/?limit=0")
    assert response.status_code == 400
    assert "limit" in response.json()["detail"]

    # limit troppo grande
    response = authed_client.get("/api/documents/?limit=101")
    assert response.status_code == 400

    # offset negativo
    response = authed_client.get("/api/documents/?offset=-1")
    assert response.status_code == 400
    assert "offset" in response.json()["detail"]


def test_list_documents_valid_pagination(authed_client):
    """
    Pagination valida deve funzionare correttamente.
    """
    response = authed_client.get("/api/documents/?limit=10&offset=0")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_upload_valid_document_and_retrieve_metadata(authed_client):
    """
    Upload di un PDF valido presente in data/pdfs deve andare a buon fine
    e il documento deve essere visibile via list + get.
    """
    pdf_files = list(PDF_DIR.glob("*.pdf"))
    assert pdf_files, "Nessun PDF presente in data/pdfs per il test."

    file_path: Path = pdf_files[0]
    with file_path.open("rb") as f:
        files = {
            "files": (file_path.name, f, "application/pdf"),
        }
        response = authed_client.post("/api/documents/", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["documents"], "La risposta deve contenere almeno un documento."
    doc = data["documents"][0]
    doc_id = doc["id"]

    # Verifica che il documento sia presente nella lista
    list_resp = authed_client.get("/api/documents/")
    assert list_resp.status_code == 200
    docs = list_resp.json()
    assert any(d["id"] == doc_id for d in docs)

    # Verifica recupero singolo documento
    get_resp = authed_client.get(f"/api/documents/{doc_id}")
    assert get_resp.status_code == 200
    single = get_resp.json()
    assert single["id"] == doc_id
    assert single["filename"] == file_path.name
