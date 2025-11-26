import uuid
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import Cookie, HTTPException, status


# Mock In-Memory Database
class MockDatabase:
    def __init__(self):
        self.documents: Dict[str, Dict] = {}
        # Chats are stored as: {chat_id: {...chat_data...}}
        self.chats: Dict[str, Dict] = {}

    def add_document(
        self, filename: str, content_type: str, file_hash: Optional[str] = None
    ) -> Dict:
        doc_id = str(uuid.uuid4())
        doc = {
            "id": doc_id,
            "filename": filename,
            "content_type": content_type,
            "upload_date": datetime.now().isoformat(),
            "status": "ingested",  # Mocking immediate ingestion
            "page_count": 5,  # Mock page count
        }
        if file_hash is not None:
            doc["file_hash"] = file_hash
        self.documents[doc_id] = doc
        return doc

    def get_documents(self) -> List[Dict]:
        return list(self.documents.values())

    def get_document(self, doc_id: str) -> Optional[Dict]:
        return self.documents.get(doc_id)

    # --- Chat helpers ---
    def add_chat(
        self,
        user_id: str,
        query: str,
        response: str,
        citations: Optional[List[Dict]] = None,
    ) -> Dict:
        chat_id = str(uuid.uuid4())
        chat = {
            "id": chat_id,
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "query": query,
            "response": response,
        }
        if citations:
            chat["citations"] = citations
        self.chats[chat_id] = chat
        return chat

    def list_chats_for_user(self) -> List[Dict]:
        """
        Returns chats for all users.
        Filtering by user is done at the router layer to keep the
        DB layer simple for the exercise.
        """
        return list(self.chats.values())

    def get_chat(self, chat_id: str) -> Optional[Dict]:
        return self.chats.get(chat_id)


# Singleton instance
db = MockDatabase()


def get_db() -> MockDatabase:
    return db


def get_current_user(user_id: Optional[str] = Cookie(default=None)):
    """
    Very simple mock authentication dependency.
    Expects a `user_id` cookie to be present on every request.
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please call the /auth/login endpoint first.",
        )
    return {"id": user_id}
