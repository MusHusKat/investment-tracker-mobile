import AsyncStorage from "@react-native-async-storage/async-storage";

// In dev, point to your local Next.js backend.
// On device/emulator update this to your machine's LAN IP e.g. http://192.168.1.x:3000
const BASE_URL = __DEV__ ? "http://localhost:3000" : "https://your-production-url.com";

export const API_BASE = BASE_URL;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("session_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch(path, { method: "DELETE" });
}
