from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import auth, chat, documents
from src.settings import settings

app = FastAPI(title=settings.APP_NAME)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for the test
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    documents.router, prefix=f"{settings.API_PREFIX}/documents", tags=["documents"]
)
app.include_router(chat.router, prefix=f"{settings.API_PREFIX}/chat", tags=["chat"])
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])


@app.get("/")
async def root():
    return {"message": "Welcome to the Mock Backend API"}
