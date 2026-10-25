import { useAuthStore } from "../store/authStore";
import type { AuthSession } from "../features/auth/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Error thrown by the API client; carries the HTTP status and problem details. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, title: string, detail: string, errors?: Record<string, string[]>) {
    super(detail || title);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
  /** Skip the automatic refresh-on-401 flow (used by the auth endpoints themselves). */
  skipAuthRefresh?: boolean;
}

/**
 * Minimal API client for the ShinigaCim backend.
 *
 *  - Adds the Authorization header from the auth store when present.
 *  - On 401 for a non-auth endpoint, refreshes the token pair once
 *    (single-flight across concurrent callers) and retries the original request.
 *  - Clears the session when the refresh token itself is invalid/expired/revoked.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRefresh, headers: extraHeaders, body, ...rest } = options;

  let response = await performRequest(path, extraHeaders, rest, body);

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await performRequest(path, extraHeaders, rest, body);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().clear();
    }
    throw await toError(response);
  }

  return (await unwrap(response)) as T;
}

async function unwrap(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function toError(response: Response): Promise<ApiError> {
  let title = response.statusText || "Request failed";
  let detail = "";
  let errors: Record<string, string[]> | undefined;
  try {
    const problem = (await response.json()) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    title = problem.title ?? title;
    detail = problem.detail ?? "";
    errors = problem.errors;
  } catch {
    // non-JSON error body — keep defaults
  }
  return new ApiError(response.status, title, detail, errors);
}

function sessionHeader(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function performRequest(
  path: string,
  extraHeaders: HeadersInit | undefined,
  rest: Partial<RequestInit>,
  body: BodyInit | Record<string, unknown> | null | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { ...sessionHeader(), ...(extraHeaders as Record<string, string>) };

  let payload = body;
  if (payload !== null && payload !== undefined && !(payload instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(payload);
  }

  return fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: payload as BodyInit | null | undefined,
  });
}

let refreshInFlight: Promise<boolean> | null = null;

/** Shared refresh; concurrent callers await the same request. */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const current = useAuthStore.getState();
  if (!current.refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!response.ok) return false;
    const session = (await response.json()) as AuthSession;
    current.setSession(session);
    return true;
  } catch {
    return false;
  }
}
