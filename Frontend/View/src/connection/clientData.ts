import { getAccessToken } from "./auth";
import { connection } from "./config";
import { requestJson } from "./http";

export type ClientPageKey = "cart" | "preferences" | "order_feedback";

export type ClientPageData = {
  page_key: ClientPageKey;
  data: Record<string, unknown>;
};

async function request<T>(
  pageKey: ClientPageKey,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Please log in to save your page data.");

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");

  return requestJson<T>(
    `${connection.fruitApiBaseUrl}/client-data/${encodeURIComponent(pageKey)}`,
    { ...options, headers },
    "Unable to save client page data.",
  );
}

export function getClientPageData(
  pageKey: ClientPageKey,
): Promise<ClientPageData> {
  return request<ClientPageData>(pageKey);
}

export function saveClientPageData(
  pageKey: ClientPageKey,
  data: Record<string, unknown>,
): Promise<ClientPageData> {
  return request<ClientPageData>(pageKey, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}
