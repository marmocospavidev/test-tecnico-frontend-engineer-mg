## Test Tecnico Frontend Engineer – Datapizza

## Come avviare l'applicazione (Backend + Frontend)

### Requisiti

- Docker e Docker Compose installati
- In alternativa: Node.js @20.9.0+ (`npm`), Python 3.10+ e `pip`

### Avvio rapido con Docker (consigliato)

Questa modalità avvia contemporaneamente il backend Python e il frontend Next.js in rete tra loro, configurando l'Hot Reload automatico per il frontend.

Da questa cartella (`test-tecnico-frontend-engineer`):

#### 1. Ambiente di Sviluppo Locale (Development)

```bash
docker-compose up --build
```

- **Frontend (Next.js):** `http://localhost:3000` (con Hot Reload attivo)
- **Backend (Python API):** `http://localhost:8000`
- **Swagger UI (Documentazione API):** `http://localhost:8000/docs`

### 2. Ambiente di Produzione (Simulazione)

Per testare l'applicazione con il build ottimizzato _standalone_ di Next.js in background:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

_(Per spegnere l'ambiente di produzione, esegui lo stesso comando sostituendo `up -d --build` con `down`)._

---

### Avvio locale senza Docker

#### Terminale 1: Backend Python

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

- **Il backend sarà disponibile su :** `http://localhost:8000`

---

#### Terminale 2: Frontend Next.js

1. Entra nella cartella frontend:
   ```bash
   cd frontend
   ```
2. Installa le dipendenze locali:
   ```bash
   npm install
   ```
3. Avvia il server di sviluppo:

   ```bash
   npm run dev
   ```

   - **Il frontend sarà disponibile su :** `http://localhost:3000`
