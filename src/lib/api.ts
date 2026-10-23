import type { Child, Observation, DomainId, Score, Activity } from "./data";

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_API_URL"]) || "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMsg = data.detail
          .map((item: { msg?: string; loc?: string[] }) => item.msg || JSON.stringify(item))
          .join("; ");
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errorMsg = text;
    }
    throw new ApiError(errorMsg, res.status);
  }

  return res.json() as Promise<T>;
}

export async function fetchChildren(): Promise<Child[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/children`);
    return await handleResponse<Child[]>(res);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      "Unable to connect to backend server. Please verify FastAPI is running at http://localhost:8000.",
      0
    );
  }
}

export async function fetchChild(id: string): Promise<Child> {
  const res = await fetch(`${API_BASE_URL}/children/${encodeURIComponent(id)}`);
  return handleResponse<Child>(res);
}

export async function fetchObservations(params?: {
  childId?: string | undefined;
  includeBaseline?: boolean | undefined;
} | undefined): Promise<Observation[]> {
  const query = new URLSearchParams();
  if (params?.childId) query.set("child_id", params.childId);
  if (params?.includeBaseline !== undefined) {
    query.set("include_baseline", String(params.includeBaseline));
  }

  const qs = query.toString();
  const url = `${API_BASE_URL}/observations${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  return handleResponse<Observation[]>(res);
}

export interface CreateObservationPayload {
  childId: string;
  domain: DomainId;
  activityId: string;
  score: Score;
  note: string;
  date?: string;
}

export async function createObservation(payload: CreateObservationPayload): Promise<Observation> {
  const res = await fetch(`${API_BASE_URL}/observations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<Observation>(res);
}

export interface UpdateObservationPayload {
  domain?: DomainId;
  activityId?: string;
  score?: Score;
  note?: string;
}

export async function updateObservation(
  id: string,
  payload: UpdateObservationPayload
): Promise<Observation> {
  const res = await fetch(`${API_BASE_URL}/observations/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<Observation>(res);
}

export async function deleteObservation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/observations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

export async function fetchActivities(domain?: DomainId): Promise<Activity[]> {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  const res = await fetch(`${API_BASE_URL}/activities${query}`);
  return handleResponse<Activity[]>(res);
}
