# Frontend – Chatbot con fact-checking (Test tecnico Datapizza)

Applicazione Next.js (App Router) che consuma il backend mock FastAPI della repository: chat con risposte in streaming NDJSON, upload e consultazione dei documenti PDF, e fact-checking delle risposte con evidenziazione delle bounding region sulle pagine dei PDF.

## Indice

1. [Avvio](#avvio)
2. [Variabili d'ambiente](#variabili-dambiente)
3. [Script disponibili](#script-disponibili)
4. [Struttura del progetto](#struttura-del-progetto)
5. [Funzionalità](#funzionalità)
6. [Architettura e scelte tecniche](#architettura-e-scelte-tecniche)
7. [Contratto con il backend](#contratto-con-il-backend)
8. [Tema, tipografia e responsive](#tema-tipografia-e-responsive)
9. [Test e verifiche](#test-e-verifiche)
10. [Limiti noti](#limiti-noti)

## Avvio

### Con Docker (consigliato)

Dalla radice della repository:

```bash
docker-compose up --build
```

- Frontend: <http://localhost:3000> (hot reload attivo)
- Backend: <http://localhost:8000> (Swagger su `/docs`)

Produzione simulata: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.

### Senza Docker

Servono Node.js ≥ 22.13 (richiesto da `pdfjs-dist` e usato dai test) e Python 3.10+.

1. **Backend** (terminale 1), da `backend/`:

   ```bash
   python -m venv .venv
   source .venv/bin/activate      # Windows: .venv\Scripts\activate
   pip install -e .
   uvicorn src.app:app --reload --host 0.0.0.0
   ```

   `--host 0.0.0.0` è necessario per raggiungere il backend da altri dispositivi della rete locale (per esempio il telefono).

2. **Frontend** (terminale 2), da `frontend/`:

   ```bash
   npm install
   npm run dev
   ```

   L'app è su <http://localhost:3000>. Al primo accesso si sceglie uno username (anche casuale con il pulsante): il backend usa un cookie `user_id`, non c'è password.

### Provare l'app da un telefono

Apri `http://<IP-del-computer>:3000` dalla stessa rete. Il browser chiama il backend sullo stesso host della pagina (porta 8000), quindi non serve cambiare configurazione. L'indirizzo deve essere elencato in `allowedDevOrigins` di `next.config.ts` per l'ambiente di sviluppo.

> In produzione (`NODE_ENV=production`) i cookie di sessione sono `secure`: su HTTP non-localhost il browser li scarta. Per provare la build di produzione da un altro dispositivo serve HTTPS.

## Variabili d'ambiente

File `.env.development` e `.env.production`:

| Variabile    | Descrizione                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `API`        | URL del backend (default `http://localhost:8000`).                          |
| `JWT_SECRET` | Chiave con cui è firmato il cookie di sessione dell'app (obbligatoria).      |

`API` è letta lato server. Nel browser, se punta a `localhost`, l'host viene sostituito con quello da cui è stata aperta la pagina (vedi `apiUrl()` in `src/lib/const.ts`).

## Script disponibili

| Comando         | Descrizione                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `npm run dev`   | Server di sviluppo.                                                      |
| `npm run build` | Build di produzione (include il controllo dei tipi).                     |
| `npm start`     | Avvia la build di produzione.                                            |
| `npm run lint`  | ESLint.                                                                  |
| `npm test`      | Test unitari con il test runner integrato di Node (nessuna dipendenza).  |

Il controllo dei tipi si esegue anche con `npx tsc --noEmit`.

## Struttura del progetto

```
src/
├─ app/
│  ├─ layout.tsx               Layout radice (sessione dietro Suspense, viewport)
│  ├─ page.tsx                 Login
│  └─ (app)/                   Area autenticata
│     ├─ layout.tsx            Provider (Redux, chat), sidebar, header
│     ├─ chat/layout.tsx       Interfaccia della chat + sincronizzazione con l'URL
│     ├─ chat/page.tsx         /chat (nuova conversazione)
│     ├─ chat/[chatId]/page.tsx /chat/<id> (conversazione esistente)
│     └─ documents/page.tsx    /documents
├─ components/
│  ├─ chat/                    ChatView, fonti, dialog di fact-checking
│  ├─ documents/               Griglia documenti, dialog dei metadati
│  ├─ pdf/                     Visualizzatore PDF, pagina, overlay
│  ├─ layout/                  Sidebar, header, avatar utente, tema
│  └─ ui/                      Componenti base (stile shadcn su Base UI)
├─ context/
│  ├─ ChatContext.tsx          Provider e logica di orchestrazione della chat
│  └─ chatReducer.ts           Reducer puro dello stato della conversazione
├─ store/                      Redux store + RTK Query (cache dei dati del server)
├─ lib/
│  ├─ api.ts                   Tutte le chiamate HTTP al backend
│  ├─ stream.ts                Parsing dello stream NDJSON
│  ├─ chat.ts                  Funzioni pure sui messaggi/chat
│  ├─ pdf/                     Geometria, cache dei documenti, hook di caricamento
│  ├─ types/                   Tipi di API e di UI
│  ├─ schemas/                 Schemi Zod (login, messaggio, PDF)
│  ├─ actions/                 Server action (login, logout)
│  └─ jwt.ts                   Sessione (cookie firmato)
├─ proxy.ts                    Protezione delle route (login obbligatorio)
└─ styles/globals.css          Token dei colori e tipografia dei messaggi
```

> Nota: `src/lib/` era ignorata dal `.gitignore` radice (regola `lib/` dei template Python); è stata aggiunta l'eccezione `!frontend/src/lib/`.

## Funzionalità

### Autenticazione
Il login crea la sessione (cookie firmato con `jose`) e il cookie `user_id` usato dal backend. `proxy.ts` reindirizza al login chi non è autenticato e porta alla chat chi lo è già. Il **logout** dal menu dell'avatar (footer della sidebar) usa la server action `act_Logout`, che chiama `deleteSession()` ed effettua il redirect al login. L'avatar mostra l'iniziale dello `user_id` e, a sidebar aperta, lo username per esteso.

### Chat con streaming
- L'invio aggiunge il messaggio dell'utente e crea subito il messaggio dell'assistant con contenuto vuoto e stato `pending`. Al primo delta passa a `streaming`, alla fine a `complete` (o `error`).
- Durante `pending` è mostrato uno spinner con "Sto generando la risposta…", durante `streaming` un indicatore discreto "Generazione in corso".
- Lo stream NDJSON è letto correttamente anche con chunk che spezzano righe o caratteri UTF-8 e con l'ultima riga senza newline. Eventi non validi, JSON malformato ed evento `error` del backend producono un errore leggibile; il testo già ricevuto resta visibile.
- Gli errori sono distinti: **richiesta non riuscita** (nessun contenuto ricevuto) o **streaming interrotto** (contenuto parziale).
- Gli aggiornamenti dei delta sono raggruppati al massimo una volta per frame e toccano solo il messaggio in streaming: i messaggi precedenti non vengono ricostruiti né ridisegnati (`React.memo`).

### Controlli durante streaming e upload
Mentre una richiesta è in streaming sono disabilitati il pulsante di invio, l'invio con Invio (senza perdere il testo digitato) e l'upload dei file. Le stesse regole sono applicate nella logica (`sendMessage`, `uploadFiles` e reducer), quindi una chiamata diretta alla funzione viene comunque rifiutata. Invio e upload si escludono a vicenda. I controlli tornano disponibili a fine stream, in caso di errore e se lo stream viene annullato.

### Conversazioni, chat recenti e routing
- `GET /chat` alimenta le "Chat recenti" della sidebar; `GET /chat/{id}` carica una conversazione esistente aprendo `/chat/<id>`.
- Dopo il primo messaggio di una nuova conversazione l'app ricava l'id della chat creata, aggiorna la lista con una sola richiesta e porta l'URL a `/chat/<id>` (`router.replace`) senza ricaricare i messaggi.
- Cambiare chat o tornare a "Nuova chat" annulla lo stream in corso e svuota subito i messaggi della conversazione precedente. Una risposta in ritardo di una conversazione che non è più aperta non viene mai applicata (vedi `epoch` nel reducer).
- Il caricamento di una conversazione mostra uno skeleton e, in caso di errore, un messaggio con "Riprova".

### Upload dei documenti
Dal pulsante `+` della chat o dalla pagina `/documents`. I file sono validati lato client (solo PDF, massimo 5 file, 10 MB ciascuno), i duplicati nella stessa selezione sono scartati, e il backend (che riconosce solo i PDF di test) può rifiutarli con un messaggio che viene mostrato. Dalla chat l'upload aggiunge un messaggio con i metadati dei file; dalla pagina documenti non tocca la conversazione. Al termine la lista dei documenti viene invalidata e si aggiorna senza ricaricare la pagina.

### Pagina `/documents`
Griglia responsive dei documenti (nome, stato, pagine, data di caricamento) con skeleton iniziale, stato vuoto con invito all'upload, errore con "Riprova" e indicatore di aggiornamento quando i dati sono già visibili. Il click su un documento apre un dialog con:

- i metadati restituiti da `GET /documents/{id}` (nome, id, tipo, data, stato, pagine, SHA-256), con skeleton e gestione errori; riaprendo un documento i dati arrivano dalla cache;
- un'anteprima del PDF con lo stesso visualizzatore usato per il fact-checking.

### Fact-checking
Quando una risposta completata contiene `references`, sotto il messaggio compare la sezione **Fonti e fact-checking** con, per ogni citazione, documento, pagina e testo citato. La sezione appartiene al singolo messaggio, non compare senza citazioni né durante lo streaming. Il click apre un dialog con:

- l'elenco di tutte le citazioni del messaggio (si passa dall'una all'altra senza chiudere il dialog);
- il testo citato;
- il PDF alla pagina citata con le **bounding region evidenziate** (più rettangoli per citazione). Si può navigare tra le pagine e cambiare lo zoom; passando a un'altra citazione dello stesso documento cambiano solo pagina ed evidenziazioni, senza riscaricare il file.

Le citazioni prive di regioni o con metadati incompleti restano consultabili come testo, con un avviso.

### Visualizzatore PDF e coordinate
Le responsabilità sono separate:

| Modulo                     | Responsabilità                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| `lib/api.ts` (`getDocumentFile`) | Recupero del file da `GET /documents/{id}/file`.            |
| `lib/pdf/documentCache.ts` | Analisi del PDF con pdf.js, cache LRU (4 documenti) e liberazione delle risorse. |
| `components/pdf/PdfPage`   | Rendering di una pagina su canvas (con densità di pixel dello schermo). |
| `lib/pdf/geometry.ts`      | **Unico punto** di conversione delle coordinate.                  |
| `components/pdf/HighlightOverlay` | Disegno dei rettangoli.                                    |
| `components/pdf/PdfViewer` | Barra di controllo (pagina, zoom), stati di caricamento ed errore. |

**Coordinate.** Dal codice del backend (`bbox_visualization.py`) risulta che `rects_in` è `[x, y, larghezza, altezza]` in **pollici**, con origine in alto a sinistra e `y` verso il basso (come il browser: nessun ribaltamento). La pagina è misurata in punti PDF (1 pollice = 72 punti) con rotazione già applicata. Ogni rettangolo diventa una percentuale della dimensione della pagina in pollici e l'overlay è steso sopra il canvas con le stesse proporzioni: zoom, ridimensionamento e pagine di formato diverso non cambiano l'allineamento. Sono documentate come ipotesi: pagine ruotate e box fuori pagina (ritagliati).

### Logo e icona della sidebar
Il trigger della sidebar mostra il logo (`public/favicon.png`) e, in hover/focus, lo sostituisce con l'icona del pannello con una transizione. Su touch (senza hover) si usa lo stato "premuto"; il pulsante dell'header mobile resta con l'icona del pannello per essere riconoscibile.

## Architettura e scelte tecniche

- **Context API + reducer per lo stato della UI.** `chatReducer.ts` è una funzione pura (testabile senza React) che gestisce messaggi, conversazione aperta, streaming, errori e upload. `ChatContext.tsx` orchestra: chiama le API, instrada gli eventi dello stream al reducer, gestisce annullamenti e navigazione.
- **Il messaggio in streaming è separato dall'array dei messaggi** (`draft`): i delta aggiornano solo quell'oggetto, quindi nessuna scansione né ricostruzione dell'elenco. A fine stream il messaggio viene consolidato.
- **`epoch` contro le risposte obsolete.** Ogni cambio di conversazione incrementa l'epoch; le azioni asincrone con epoch vecchio vengono ignorate dal reducer. In più lo stream viene annullato con `AbortController`.
- **RTK Query per i dati del server (già presente nel progetto, nessuna nuova libreria di caching).** Offre deduplica, cache e invalidazione: la lista chat e documenti è invalidata alla creazione di qualcosa (un solo fetch per evento), le singole chat/documenti sono immutabili e restano in cache 5 minuti. Il reducer conserva solo lo stato transitorio, evitando copie divergenti degli stessi dati. `currentData` espone solo i dati dell'id richiesto, quindi un cambio rapido tra conversazioni non mostra dati sbagliati. La cache è legata all'utente (si azzera al logout).
- **Interfaccia della chat nel layout.** `chat/layout.tsx` ospita la UI e `ChatRouteSync` (con `useParams` dietro Suspense) allinea la conversazione all'URL; le pagine `/chat` e `/chat/[chatId]` sono vuote. Così il passaggio da `/chat` a `/chat/<id>` non rimonta l'interfaccia. Il layout radice legge la sessione dietro `Suspense` per essere compatibile con `cacheComponents`.
- **Trasporto separato dalla logica.** Tutte le chiamate HTTP sono in `lib/api.ts`; il parsing dello stream in `lib/stream.ts`; gli URL degli endpoint in `ENDPOINTS` (`lib/const.ts`).
- **Tipi.** I payload del backend (`APIChat`, `Document`, `StreamEvent`…) sono separati dai tipi di UI (`ChatMessage`, `ChatStatus`…); gli eventi dello stream sono validati con una type guard (nessun cast).

## Contratto con il backend

Endpoint usati (prefisso `/api`): `POST /auth/login`, `POST /chat/` (stream NDJSON con eventi `content`, `citations`, `error`), `GET /chat/`, `GET /chat/{id}`, `POST /documents/` (multipart, campo `files`), `GET /documents/`, `GET /documents/{id}`, `GET /documents/{id}/file`. Il frontend non modifica il contratto; lo stream non restituisce l'id della chat creata, quindi viene ricavato confrontando domanda e risposta con la lista aggiornata. Le liste sono paginate (max 100) e ordinate dal più vecchio: `lib/api.ts` scorre tutte le pagine.

## Tema, tipografia e responsive

- **Tema chiaro/scuro** (selettore nell'header, segue il sistema di default). Superfici neutre con una leggera dominante blu, **blu Datapizza** come colore delle azioni e **rosso Datapizza** solo come accento del brand (selezione del testo, indicatore dell'elemento attivo della sidebar). I colori di stato sono semantici e separati dal brand: rosso = errore, verde = successo, ambra = avviso, blu = informazione/avanzamento. I token sono in `styles/globals.css`, con coppie di colori pensate per il contrasto AA (verificate con uno script sul browser in entrambi i temi). Nel tema scuro il logo del login è su una scheda bianca perché il file ha la scritta scura.
- **Messaggi di stato.** Il componente `ui/alert` usa icona, superficie colorata e testo a pieno contrasto, quindi il significato non dipende solo dal colore; gli errori sono annunciati (`role="alert"`), gli altri stati in modo non invasivo.
- **Tipografia dei messaggi** (famiglie di font invariate): 15px su telefono e 16px da `sm` in su, interlinea 1,65, stili per titoli, liste, tabelle (con scroll orizzontale interno), codice e citazioni, a capo del testo semplice mantenuti. L'input è sempre a 16px (evita lo zoom automatico di iOS).
- **Altezze.** Layout a colonna con altezza `dvh` (viewport realmente visibile su mobile): intestazione, messaggi scorrevoli e input in basso, senza scroll della pagina. `viewportFit: cover` e padding con `env(safe-area-inset-bottom)` per i telefoni con notch, `interactiveWidget: resizes-content` per mantenere visibile l'input con la tastiera aperta. I dialog usano `dvh` e rimangono nel viewport.

## Test e verifiche

`npm test` esegue 50 test unitari con `node --test` (nessuna dipendenza aggiunta) su:

- reducer (flusso dello streaming, errori, annullamenti e risposte obsolete, conversazioni, upload, esclusione tra invio e upload);
- parsing dello stream NDJSON (chunk spezzati, UTF-8, righe senza newline, JSON malformato, eventi sconosciuti);
- funzioni pure su chat e file;
- geometria delle bounding region (conversione in percentuale, ritaglio, pagine, riferimenti incompleti).

Il comportamento nel browser (streaming, navigazione tra chat, upload, dialog, PDF con evidenziazioni a vari zoom e dimensioni, logout, accesso da rete locale, temi e viewport mobile) è stato verificato manualmente contro il backend reale. Controlli di qualità: `npx tsc --noEmit`, `npm run lint` (resta un errore preesistente in `src/hooks/use-mobile.ts`) e `npm run build`.

## Limiti noti

- **Una chat = un solo scambio.** Il backend salva ogni domanda/risposta come chat separata: i messaggi successivi in una conversazione compaiono come chat distinte nella sidebar e, dopo un refresh, `/chat/<id>` mostra solo il primo scambio.
- **Documenti globali.** `GET /documents/` restituisce i documenti di tutti gli utenti, e il backend crea un nuovo documento a ogni upload (lo stesso file può comparire più volte). `page_count` è un valore mock (5): il visualizzatore usa il numero reale di pagine del PDF.
- **Markdown.** Le risposte del backend contengono markdown che viene mostrato come testo (si rendono solo gli elementi HTML): interpretarlo richiederebbe una libreria dedicata.
- **Cambio sezione durante lo stream.** Se si lascia la chat mentre una risposta è in corso, lo stream continua e la conversazione viene salvata (compare tra le chat recenti), ma tornando su `/chat` si trova una chat vuota.
- **Prerender e dev.** In sviluppo Next segnala ancora avvisi sulla lettura dei cookie nel layout radice; la build di produzione completa correttamente.
- **Sessione in produzione su HTTP.** Vedi la nota nella sezione "Provare l'app da un telefono".
- **Versione di Node nei Dockerfile.** Le immagini usano Node 20, mentre `pdfjs-dist` dichiara Node ≥ 22.13: `npm install` mostra un avviso sull'engine, ma la libreria gira solo nel browser. `npm test` richiede invece Node ≥ 22.13 (per eseguire i file TypeScript senza compilazione).
