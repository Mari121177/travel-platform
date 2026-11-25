import {
  ApiError,
  type ApiErrorBody,
  defaultMessageForStatus,
  extractMessages,
  readPayload,
} from "./errors";

export type QueryValue = string | number | boolean | null | undefined;

export type QueryInit = Record<string, QueryValue | QueryValue[]>;

export type ApiOptions = Omit<RequestInit, "body" | "method"> & {
  method?: string;
  body?: unknown;
  query?: QueryInit;
  retryOnUnauthorized?: boolean;
};

const API_ROOT = "/api";

const NO_RETRY_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

function buildQuery(query?: QueryInit): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        params.append(key, String(item));
      }
      continue;
    }
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toUrl(path: string, query?: QueryInit): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${normalized}${buildQuery(query)}`;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

let refreshInFlight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_ROOT}/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function send(path: string, options: ApiOptions): Promise<Response> {
  const { method = "GET", body, query, retryOnUnauthorized, headers, ...init } =
    options;
  void retryOnUnauthorized;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  const formData = isFormData(body);
  if (body !== undefined && !formData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return fetch(toUrl(path, query), {
    ...init,
    method,
    credentials: "same-origin",
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : formData
          ? body
          : JSON.stringify(body),
  });
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const mayRetry =
    options.retryOnUnauthorized !== false &&
    !NO_RETRY_PATHS.some((prefix) => path.startsWith(prefix));

  let response = await send(path, options);

  if (response.status === 401 && mayRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send(path, { ...options, retryOnUnauthorized: false });
    }
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const fallback = defaultMessageForStatus(response.status);
    const body =
      payload && typeof payload === "object"
        ? (payload as ApiErrorBody)
        : null;
    throw new ApiError(
      response.status,
      extractMessages(payload, fallback),
      body,
    );
  }

  return payload as T;
}

export const api = {
  get<T>(path: string, options: Omit<ApiOptions, "method" | "body"> = {}) {
    return apiFetch<T>(path, { ...options, method: "GET" });
  },
  post<T>(
    path: string,
    body?: unknown,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return apiFetch<T>(path, { ...options, method: "POST", body });
  },
  put<T>(
    path: string,
    body?: unknown,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return apiFetch<T>(path, { ...options, method: "PUT", body });
  },
  patch<T>(
    path: string,
    body?: unknown,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return apiFetch<T>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(
    path: string,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return apiFetch<T>(path, { ...options, method: "DELETE" });
  },
  upload<T>(
    path: string,
    formData: FormData,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return apiFetch<T>(path, { ...options, method: "POST", body: formData });
  },
};

export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.pathname.startsWith("/uploads/")) return url.pathname;
    return trimmed;
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}
