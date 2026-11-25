export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  path?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Please check the information you entered and try again.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "We could not find what you were looking for.";
    case 409:
      return "This action conflicts with the current state. Reload and try again.";
    case 423:
      return "This account is temporarily locked. Please try again later.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "Something went wrong on our side. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function extractMessages(payload: unknown, fallback: string): string[] {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return [payload];
  }
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return [message];
    }
    if (Array.isArray(message)) {
      const messages = message.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      );
      if (messages.length > 0) return messages;
    }
  }
  return [fallback];
}

export async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  readonly body: ApiErrorBody | null;

  constructor(
    status: number,
    messages: string[],
    body: ApiErrorBody | null = null,
  ) {
    super(messages[0] ?? defaultMessageForStatus(status));
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export function getErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError) return error.messages;
  if (error instanceof Error && error.message.trim().length > 0) {
    return [error.message];
  }
  return ["Something went wrong. Please try again."];
}

export function getErrorMessage(error: unknown): string {
  return getErrorMessages(error).join(" ");
}
