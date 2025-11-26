from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, field_validator

router = APIRouter()


class LoginRequest(BaseModel):
    user_id: str = "test-user"

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("user_id cannot be empty or whitespace only")
        if len(v) > 100:
            raise ValueError("user_id cannot exceed 100 characters")
        # Basic sanitization - only alphanumeric, dash, underscore
        if not all(c.isalnum() or c in "-_" for c in v):
            raise ValueError(
                "user_id can only contain alphanumeric characters, dashes, and underscores"
            )
        return v.strip()


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    """
    Very simple mock login endpoint.

    It just sets a `user_id` cookie that the rest of the API
    will use to authenticate the user. There is no password
    or registration logic by design for this test.

    Returns 422 if user_id is invalid (empty, too long, or contains invalid characters).
    """
    response.set_cookie(
        key="user_id",
        value=payload.user_id,
        httponly=True,
        samesite="lax",
    )
    return {"user_id": payload.user_id}
