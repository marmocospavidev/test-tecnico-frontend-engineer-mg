import { apiUrl, ENDPOINTS } from "./const";
import { TLoginSchema } from "./schemas/LoginSchema";
import { parseStreamLine, readLines } from "./stream";
import type {
  APIChat,
  APILoginResponseSuccess,
  APIUploadDocumentsResponse,
  APIUploadDocumentsResponseSuccess,
  Document,
  FetchStreamOptions,
} from "./types/api";

type LoginReturnSuccess = {
  success: true;
  message?: never;
  data: TLoginSchema;
};

interface LoginReturnFailed {
  success: false;
  message?: string;
  data?: never;
}

type LoginReturn = LoginReturnSuccess | LoginReturnFailed;

export async function login(
  user_id: string,
  remember: boolean = false,
): Promise<LoginReturn> {
  try {
    const url = apiUrl() + ENDPOINTS.login;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: "Login failed",
      };
    } else {
      const data = {
        ...((await response.json()) as APILoginResponseSuccess),
        remember,
      };
      return {
        success: true,
        data,
      };
    }
  } catch (e) {
    console.error(
      "Error logging in:",
      (e as Error).message,
    );
    return {
      success: false,
      message: (e as Error).message,
    };
  }
}

async function readErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      return body.detail;
    }
  } catch {
    // Corpo dell'errore non JSON: si usa il messaggio di ripiego.
  }

  return `${fallback} (${response.status})`;
}

async function getJSON<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(apiUrl() + path, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorDetail(
        response,
        "Errore durante la comunicazione con l'API",
      ),
    );
  }

  return (await response.json()) as T;
}

export async function chat({
  data,
  onMessage,
  onError,
  signal,
}: FetchStreamOptions): Promise<void> {
  try {
    const url = apiUrl() + ENDPOINTS.chat;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
      credentials: "include",
      body: JSON.stringify(data),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Errore API: ${response.status}, ${await response.text()}`,
      );
    }

    if (!response.body) {
      throw new Error("Stream non disponibile");
    }

    const handleLine = (line: string) => {
      const event = parseStreamLine(line);

      if (event.type === "error") {
        throw new Error(event.message);
      }

      onMessage(event);
    };

    await readLines(response.body, handleLine);
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error("Errore sconosciuto");

    if (onError) {
      onError(normalizedError);
    } else {
      throw normalizedError;
    }
  }
}

// Il backend pagina (massimo 100 per pagina) ed elenca prima gli elementi
// più vecchi, quindi i più recenti stanno nell'ultima pagina.
const PAGE_SIZE = 100;

async function getAllPages<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await getJSON<T[]>(
      `${path}?limit=${PAGE_SIZE}&offset=${offset}`,
      signal,
    );

    items.push(...page);

    if (page.length < PAGE_SIZE) return items;
  }
}

export function listChats(
  signal?: AbortSignal,
): Promise<APIChat[]> {
  return getAllPages<APIChat>(ENDPOINTS.chat, signal);
}

export function getChat(
  chatId: string,
  signal?: AbortSignal,
): Promise<APIChat> {
  return getJSON<APIChat>(
    ENDPOINTS.chat + encodeURIComponent(chatId),
    signal,
  );
}

type UploadReturnSuccess = {
  success: true;
} & APIUploadDocumentsResponseSuccess;

interface UploadReturnFailed {
  success: false;
  detail: string;
}

type UploadReturn =
  | UploadReturnSuccess
  | UploadReturnFailed;

export async function uploadDocuments(
  files: File[],
): Promise<UploadReturn> {
  try {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch(
      apiUrl() + ENDPOINTS.documents,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(
        await readErrorDetail(response, "Upload non riuscito"),
      );
    }

    const body = (await response.json()) as APIUploadDocumentsResponse;

    if (!("documents" in body)) {
      throw new Error("Risposta di upload non valida");
    }

    return { success: true, ...body };
  } catch (e) {
    console.error(
      "Error uploading documents :",
      (e as Error).message,
    );
    return {
      success: false,
      detail: (e as Error).message,
    };
  }
}

export function listDocuments(
  signal?: AbortSignal,
): Promise<Document[]> {
  return getAllPages<Document>(ENDPOINTS.documents, signal);
}

export function getDocument(
  documentId: string,
  signal?: AbortSignal,
): Promise<Document> {
  return getJSON<Document>(
    ENDPOINTS.documents + encodeURIComponent(documentId),
    signal,
  );
}

export async function getDocumentFile(
  documentId: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${apiUrl()}${ENDPOINTS.documents}${encodeURIComponent(documentId)}/file`,
    { credentials: "include", signal },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorDetail(
        response,
        "Documento non disponibile",
      ),
    );
  }

  return response.arrayBuffer();
}
