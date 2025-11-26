## Test Tecnico Frontend Engineer – Datapizza

Questo repository contiene:

- **Backend mock** già implementato (FastAPI + Docker) che simula un chatbot con:
  - autenticazione via cookie,
  - upload e gestione di documenti PDF,
  - endpoint di chat in **streaming NDJSON** con citazioni e bounding box,
  - storico delle chat per utente.
- **Documentazione del test frontend**: vedi il file `Test_tecnico_Frontend_Developer.md`.

L'obiettivo sarà sviluppare il **Frontend UI/UX** (React o framework equivalente) consumando questo backend.

---

## Come avviare il backend

### Requisiti

- Docker e Docker Compose installati
- In alternativa: Python 3.12+ e `pip`

### Avvio rapido con Docker (consigliato)

Da questa cartella (`test-tecnico-frontend-engineer`):

```bash
docker-compose up --build
```

Il backend sarà disponibile su:

- API base: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### Avvio locale senza Docker

1. Entra nella cartella `backend`:

```bash
cd backend
```

2. Crea un virtualenv e installa le dipendenze:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
pip install -e .[test]  # opzionale, per i test
```

3. Avvia il server:

```bash
uvicorn src.app:app --reload
```

---

## Panoramica delle API principali

Prefisso comune: `http://localhost:8000/api`

- **Auth**

  - `POST /api/auth/login`
    - Body: `{"user_id": "<stringa>"}` (validato, solo caratteri alfanumerici, `-` e `_`).
    - Imposta un **cookie `user_id`** usato da tutte le altre API.

- **Documenti**

  - `POST /api/documents/`
    - Multipart form, campo `files`: uno o più PDF.
    - Verifica che i PDF corrispondano a quelli forniti nel test (hash pre-caricati).
    - Restituisce una lista di documenti mockati con metadata.
  - `GET /api/documents/`
    - Restituisce l’elenco dei documenti caricati.
  - `GET /api/documents/{doc_id}`
    - Restituisce il dettaglio di un singolo documento.
  - `GET /api/documents/{doc_id}/file`
    - Restituisce il file PDF effettivo del documento.

- **Chat**
  - `POST /api/chat/`
    - Body minimo: `{"query": "<testo della domanda>"}`.
    - Restituisce uno **stream NDJSON**:
      - chunk `{"type": "content", "delta": "<stringa>"}` per il testo generato (Markdown + HTML),
      - un chunk finale `{"type": "citations", "references": [...]}` con i riferimenti ai documenti e le loro bounding regions.
  - `GET /api/chat/`
    - Restituisce lo **storico delle chat** dell'utente corrente.
  - `GET /api/chat/{chat_id}`
    - Restituisce i dettagli di una singola chat.

Per il dettaglio completo degli schemi, usa Swagger UI (`/docs`).

---

## Test automatici backend

Dalla cartella `backend`:

```bash
pytest
```

I test coprono:

- error handling su auth, documenti e chat,
- upload documenti (validi e invalidi),
- streaming della chat con citations,
- storico chat e bounding regions.
