import { getAccessToken } from "./auth";
import { connection } from "./config";
import { requestJson } from "./http";

export type MessageContact = {
  customer_id: string;
  full_name: string;
  email: string;
  role: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type DirectMessage = {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  audio_url: string | null;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Please log in to access your messages.");

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");

  return requestJson<T>(
    `${connection.authApiBaseUrl}/messages${path}`,
    { ...options, headers },
    "Unable to load messages.",
  );
}

export function getMessageContacts(): Promise<MessageContact[]> {
  return request<MessageContact[]>("/contacts");
}

export function getConversation(contactId: string): Promise<DirectMessage[]> {
  return request<DirectMessage[]>(`/${encodeURIComponent(contactId)}`);
}

export function sendDirectMessage(
  recipientId: string,
  body: string,
): Promise<DirectMessage> {
  return request<DirectMessage>("", {
    method: "POST",
    body: JSON.stringify({ recipient_id: recipientId, body }),
  });
}

export async function sendVoiceMessage(
  recipientId: string,
  recording: Blob,
): Promise<DirectMessage> {
  const bytes = new Uint8Array(await recording.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return request<DirectMessage>("/voice", {
    method: "POST",
    body: JSON.stringify({
      recipient_id: recipientId,
      audio_base64: btoa(binary),
      audio_content_type: recording.type || "audio/webm",
    }),
  });
}

export async function getVoiceMessageAudio(
  contactId: string,
  messageId: string,
): Promise<Blob> {
  const token = getAccessToken();
  if (!token) throw new Error("Please log in to access your messages.");

  const response = await fetch(
    `${connection.authApiBaseUrl}/messages/${encodeURIComponent(contactId)}/${encodeURIComponent(messageId)}/audio`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error("Unable to load this voice message.");
  return response.blob();
}
