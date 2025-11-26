import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.dependencies import db


@pytest.fixture
def client() -> TestClient:
    """
    Fresh TestClient with in-memory DB cleared before each test.
    """
    db.documents.clear()
    db.chats.clear()
    return TestClient(app)


@pytest.fixture
def authed_client(client: TestClient) -> TestClient:
    """
    TestClient con autenticazione mock già effettuata.
    """
    response = client.post("/api/auth/login", json={"user_id": "test-user"})
    assert response.status_code == 200
    return client


