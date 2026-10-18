const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function apiRequest<T = void>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let message = `HTTP Error ${res.status}`;
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        message = errorData.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(", ");
      } else if (typeof errorData.detail === "string") {
        message = errorData.detail;
      }
    }
    throw new Error(message);
  }

  return res.json();
}