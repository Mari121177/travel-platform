import { cookies } from "next/headers";
import {
  ApiError,
  type ApiErrorBody,
  defaultMessageForStatus,
  extractMessages,
  readPayload,
} from "./errors";

const BACKEND_URL = (
  process.env.BACKEND_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export interface ServerApiOptions {
  withAuth?: boolean;
  revalidate?: number | false;
  tags?: string[];
}

type ServerRequestInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export async function serverApiFetch<T>(
  path: string,
  options: ServerApiOptions = {},
): Promise<T> {
  const { withAuth = false, revalidate, tags } = options;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${BACKEND_URL}/api${normalized}`;

  const headers = new Headers({ Accept: "application/json" });
  if (withAuth) {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    if (cookieHeader) headers.set("cookie", cookieHeader);
  }

  const init: ServerRequestInit = { headers, method: "GET" };
  if (revalidate !== undefined || tags) {
    init.next = { revalidate, tags };
  } else {
    init.cache = "no-store";
  }

  const response = await fetch(url, init);
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

export function serverApiPublic<T>(
  path: string,
  revalidate: number | false = 300,
): Promise<T> {
  return serverApiFetch<T>(path, { revalidate });
}

export function serverApiAuth<T>(path: string): Promise<T> {
  return serverApiFetch<T>(path, { withAuth: true });
}
