import asyncio
import hashlib
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from src.dependencies import MockDatabase, get_current_user, get_db
from src.settings import settings
from src.utils import ALLOWED_FILE_HASHES, PDF_DIR

router = APIRouter()


@router.post("/")
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mock upload endpoint.
    Accepts files, calculates SHA-256 to verify if they exist in data/pdfs.
    If valid, simulates processing delay and stores metadata in mock DB.
    If invalid, returns 400 error.

    Returns:
    - 400: Empty file list, file not recognized, or file read error
    - 200: Successful upload
    """
    # Validate files list is not empty
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="No files provided. Please upload at least one document.",
        )

    uploaded_docs = []
    validated_files: List[dict] = []

    for file in files:
        try:
            # Calculate hash of uploaded file content
            sha256_hash = hashlib.sha256()
            while content := await file.read(4096):
                sha256_hash.update(content)

            file_hash = sha256_hash.hexdigest()

            # Reset cursor for potential future use (though not needed for mock)
            await file.seek(0)

            # Check if hash exists in allowed list
            if file_hash not in ALLOWED_FILE_HASHES:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is not recognized. Please upload one of the provided test documents.",
                )

            validated_files.append(
                {
                    "upload_file": file,
                    "file_hash": file_hash,
                    "filename": file.filename,
                    "content_type": file.content_type,
                }
            )
        except HTTPException:
            # Re-raise HTTPException as-is
            raise
        except Exception as e:
            # Catch any file read errors
            raise HTTPException(
                status_code=400,
                detail=f"Error processing file '{file.filename}': {str(e)}",
            )

    # If all files are valid, proceed with "ingestion"
    # Simulate processing delay
    await asyncio.sleep(settings.MOCK_DELAY_SECONDS)

    for item in validated_files:
        upload_file = item["upload_file"]
        # Reset cursor again just in case
        await upload_file.seek(0)
        doc = db.add_document(
            filename=item["filename"],
            content_type=item["content_type"],
            file_hash=item["file_hash"],
        )
        uploaded_docs.append(doc)

    return {
        "message": f"Successfully uploaded {len(files)} file{'s' if len(files) > 1 else ''}",
        "documents": uploaded_docs,
    }


@router.get("/")
async def list_documents(
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """
    Returns a (paginated) list of all ingested documents.

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

    documents = db.get_documents()
    return documents[offset : offset + limit]


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}/file")
async def get_document_file(
    doc_id: str,
    db: MockDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the actual PDF file for a document.
    The file is retrieved from the data/pdfs directory by matching the filename.
    """
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.get("filename")
    if not filename:
        raise HTTPException(status_code=404, detail="Document filename not found")

    file_path = PDF_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
    )
