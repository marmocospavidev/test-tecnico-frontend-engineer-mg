import "server-only";
import { JWTPayload, SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { redirect } from "next/navigation";
import { Session } from "./actions/auth";

interface SessionJWTPayload extends JWTPayload {
  user_id: string;
  remember: boolean;
  timestamp: number;
}

const secret_env = process.env.JWT_SECRET;

if (!secret_env) {
  throw new Error(
    "JWT_SECRET environment variable is not defined",
  );
}

const JWT_SECRET = new TextEncoder().encode(secret_env);

const DURATION_DAYS = 30;
const DURATION_MS = DURATION_DAYS * 24 * 60 * 60;

const COOKIE_OPTIONS = {
  name: "auth",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
  duration: DURATION_MS,
};

export async function encrypt(payload: SessionJWTPayload) {
  const expiration = payload.remember
    ? `${DURATION_DAYS}d`
    : "1d";

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(JWT_SECRET);
}

export async function decrypt(cookie: string | undefined) {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(
      cookie,
      JWT_SECRET,
      {
        algorithms: ["HS256"],
      },
    );
    return payload as SessionJWTPayload;
  } catch (e) {
    return null;
  }
}

export async function createSession(
  data: { user_id: string },
  remember: boolean = false,
) {
  const { user_id } = data;
  if (!user_id)
    throw new Error(
      "User ID is required to create a session",
    );

  const timestamp = Date.now();
  const session = await encrypt({
    user_id,
    remember,
    timestamp,
  });
  const expires = remember
    ? new Date(timestamp + COOKIE_OPTIONS.duration)
    : undefined;

  (await cookies()).set({
    name: COOKIE_OPTIONS.name,
    value: session,
    expires,
    ...COOKIE_OPTIONS.options,
  } as ResponseCookie);

  (await cookies()).set({
    name: "user_id",
    value: user_id,
    expires,
    ...COOKIE_OPTIONS.options,
  } as ResponseCookie);

  return true;
}

export async function createSessionAndRedirect(
  ...args: Parameters<typeof createSession>
) {
  await createSession(...args);
  redirect("/chat");
}

export async function getSession() {
  const sessionCookie = (await cookies()).get(
    COOKIE_OPTIONS?.name,
  )?.value;
  const session = (await decrypt(
    sessionCookie,
  )) as unknown as Session | null;

  if (!session) return null;
  if (session.remember) refreshSession(session);

  return session;
}

export async function refreshSession(session: Session) {
  const { user_id, remember, timestamp } = session;

  const now = Date.now();
  const timeSinceLastRefresh = now - timestamp;
  const refreshThreshold = 15 * 60 * 1000;
  if (timeSinceLastRefresh < refreshThreshold) return;
  await createSession({ user_id }, remember);
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_OPTIONS.name);
  (await cookies()).delete("user_id");
  return true;
}
