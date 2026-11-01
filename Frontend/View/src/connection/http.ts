type ApiErrorBody = {
  detail?: unknown;
  request_id?: unknown;
};

const API_REQUEST_TIMEOUT_MS = 20_000;

export class ApiRequestError extends Error {
  readonly kind: "http" | "network" | "response";
  readonly status?: number;
  readonly requestId?: string;

  constructor(
    message: string,
    kind: "http" | "network" | "response",
    status?: number,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.kind = kind;
    this.status = status;
    this.requestId = requestId;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item) => {
      if (typeof item !== "object" || item === null || !("msg" in item)) {
        return [];
      }
      const location =
        "loc" in item && Array.isArray(item.loc)
          ? item.loc
              .filter((part: unknown) => part !== "body")
              .join(".")
          : "";
      return typeof item.msg === "string"
        ? [location ? `${location}: ${item.msg}` : item.msg]
        : [];
    });
    if (messages.length > 0) return messages.join("; ");
  }

  return fallback;
}

export async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  fallbackMessage = "The request failed.",
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  let response: Response;
  try {
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new ApiRequestError(
          "The server took too long to respond. Please try again.",
          "network",
        );
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      throw new ApiRequestError(
        "Unable to connect to the server. Check your connection and try again.",
        "network",
      );
    }

    if (response.status === 204 || response.status === 205) {
      if (!response.ok) {
        throw new ApiRequestError(fallbackMessage, "http", response.status);
      }
      return undefined as T;
    }

    let body: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      let responseText = "";
      try {
        responseText = await response.text();
        if (responseText) {
          body = JSON.parse(responseText) as unknown;
        }
      } catch {
        if (controller.signal.aborted && !options.signal?.aborted) {
          throw new ApiRequestError(
            "The server took too long to respond. Please try again.",
            "network",
          );
        }
        if (response.ok) {
          throw new ApiRequestError(
            "The server returned an invalid response.",
            "response",
            response.status,
            response.headers.get("X-Request-ID") ?? undefined,
          );
        }
      }
      if (response.ok && !responseText) {
        throw new ApiRequestError(
          "The server returned an empty response.",
          "response",
          response.status,
          response.headers.get("X-Request-ID") ?? undefined,
        );
      }
    } else if (response.ok) {
      throw new ApiRequestError(
        "The server returned an unsupported response.",
        "response",
        response.status,
        response.headers.get("X-Request-ID") ?? undefined,
      );
    }

    if (!response.ok) {
      const detail = isApiErrorBody(body) ? body.detail : undefined;
      const message = getErrorMessage(detail, fallbackMessage);
      const requestIdValue =
        isApiErrorBody(body) && typeof body.request_id === "string"
          ? body.request_id
          : response.headers.get("X-Request-ID");
      const requestId = requestIdValue ?? undefined;
      throw new ApiRequestError(
        requestId ? `${message} (Reference: ${requestId})` : message,
        "http",
        response.status,
        requestId,
      );
    }

    return body as T;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
