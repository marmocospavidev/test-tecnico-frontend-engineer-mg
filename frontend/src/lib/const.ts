const DEFAULT_API_URL =
  process.env.API || "http://localhost:8000";

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export function apiUrl(): string {
  if (typeof window === "undefined") return DEFAULT_API_URL;

  const url = new URL(DEFAULT_API_URL);

  if (LOOPBACK_HOSTS.includes(url.hostname)) {
    url.hostname = window.location.hostname;
  }

  return url.origin;
}

export const ENDPOINTS = {
  login: "/api/auth/login",
  chat: "/api/chat/",
  documents: "/api/documents/",
} as const;

export const usernames = [
  "CyberNauta",
  "ByteWizard",
  "NovaCode",
  "PixelVortex",
  "QuantumDrifter",
  "ShadowStrike",
  "ApexPhantom",
  "VenomPulse",
  "IronClaw",
  "FrostBite",
  "UrbanEcho",
  "VelvetFog",
  "CosmicDust",
  "LunarAura",
  "QuietStorm",
  "AstralWanderer",
  "NeonRaven",
  "SolisVibe",
  "CipherSoul",
  "EchoChaser",
];
