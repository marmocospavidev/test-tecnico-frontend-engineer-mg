import hashlib
from pathlib import Path
from typing import Dict

# Allowed PDFs directory
PDF_DIR = Path(__file__).parent.parent / "data" / "pdfs"


def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def load_allowed_file_hashes() -> Dict[str, str]:
    """
    Scans the data/pdfs directory and returns a dictionary mapping
    SHA-256 hashes to filenames.
    """
    allowed_files = {}
    if not PDF_DIR.exists():
        print(f"Warning: {PDF_DIR} does not exist.")
        return allowed_files

    for file_path in PDF_DIR.glob("*.pdf"):
        file_hash = calculate_file_hash(file_path)
        allowed_files[file_hash] = file_path.name
        print(f"Loaded allowed PDF: {file_path.name} (Hash: {file_hash[:8]}...)")

    return allowed_files


# Global dictionary of allowed file hashes
ALLOWED_FILE_HASHES = load_allowed_file_hashes()
