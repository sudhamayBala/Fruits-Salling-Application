import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getAccessToken,
  getConversation,
  getCurrentUser,
  getMessageContacts,
  getVoiceMessageAudio,
  sendDirectMessage,
  sendVoiceMessage,
} from "../../connection";
import type {
  CurrentUser,
  DirectMessage,
  MessageContact,
} from "../../connection";
import "../../styles/page/DealerCommunication.css";

function formatMessageTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DirectMessages({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messagesForContact, setMessagesForContact] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [voiceDraft, setVoiceDraft] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceUrls, setVoiceUrls] = useState<Record<string, string>>({});
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationFailure, setConversationFailure] = useState<{
    contactId: string;
    message: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingPartsRef = useRef<Blob[]>([]);
  const recordingContactIdRef = useRef<string | null>(null);
  const selectedContactIdRef = useRef(selectedContactId);
  const voiceUrlsRef = useRef<string[]>([]);
  const Container = embedded ? "section" : "main";
  const isClientPage =
    !embedded && pathname === "/client/messages" && user?.role !== "admin";

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      try {
        const [currentUser, messageContacts] = await Promise.all([
          getCurrentUser("Please log in to access your messages."),
          getMessageContacts(),
        ]);
        if (!active) return;
        if (!embedded && pathname === "/messages") {
          navigate(
            currentUser.role === "admin"
              ? "/owner/communications"
              : "/client/messages",
            { replace: true },
          );
          return;
        }
        if (!embedded && pathname === "/client/messages" && currentUser.role === "admin") {
          navigate("/owner/communications", { replace: true });
          return;
        }
        setUser(currentUser);
        setContacts(messageContacts);
        setSelectedContactId(
          (selected) => selected ?? messageContacts[0]?.customer_id ?? null,
        );
        setError("");
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your messages.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInbox();
    return () => {
      active = false;
    };
  }, [embedded, navigate, pathname]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  useEffect(() => {
    if (!user || !getAccessToken()) return;
    let active = true;
    const intervalId = window.setInterval(() => {
      void getMessageContacts()
        .then((updatedContacts) => {
          if (active) setContacts(updatedContacts);
        })
        .catch((refreshError: unknown) => {
          if (active) {
            setError(
              refreshError instanceof Error
                ? refreshError.message
                : "Unable to refresh your messages.",
            );
          }
        });
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (!selectedContactId || !user) return;
    let active = true;
    let requestInFlight = false;
    const refreshConversation = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const conversation = await getConversation(selectedContactId);
        if (active) {
          setMessages(conversation);
          setMessagesForContact(selectedContactId);
        }
      } catch (loadError) {
        if (active) {
          setConversationFailure({
            contactId: selectedContactId,
            message: loadError instanceof Error
              ? loadError.message
              : "Unable to load this conversation.",
          });
        }
      } finally {
        requestInFlight = false;
      }
    };

    void refreshConversation();
    const intervalId = window.setInterval(() => {
      void refreshConversation();
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selectedContactId, user]);

  const visibleMessages = useMemo(
    () => messagesForContact === selectedContactId ? messages : [],
    [messages, messagesForContact, selectedContactId],
  );
  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLocaleLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      `${contact.full_name} ${contact.customer_id} ${contact.email}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [contactSearch, contacts]);
  const voiceDraftUrl = useMemo(
    () => voiceDraft ? URL.createObjectURL(voiceDraft) : null,
    [voiceDraft],
  );
  useEffect(() => {
    return () => {
      if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
    };
  }, [voiceDraftUrl]);
  const conversationError =
    conversationFailure?.contactId === selectedContactId
      ? conversationFailure.message
      : "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedContactId || sending) return;

    setSending(true);
    setConversationFailure(null);
    try {
      const sentMessage = await sendDirectMessage(selectedContactId, body);
      setMessages((current) => [...current, sentMessage]);
      setMessagesForContact(selectedContactId);
      setDraft("");
      setContacts((current) =>
        current.map((contact) =>
          contact.customer_id === selectedContactId
            ? {
                ...contact,
                last_message: sentMessage.body,
                last_message_at: sentMessage.created_at,
              }
            : contact,
        ),
      );
    } catch (sendError) {
      setConversationFailure({
        contactId: selectedContactId,
        message: sendError instanceof Error
          ? sendError.message
          : "Unable to send your message.",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleStartRecording() {
    if (!selectedContactId || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setConversationFailure({
        contactId: selectedContactId,
        message: "Voice recording is not supported by this browser.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (selectedContactIdRef.current !== selectedContactId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recordingPartsRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingPartsRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const voiceMessage = new Blob(recordingPartsRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (recordingContactIdRef.current !== selectedContactIdRef.current) return;
        if (voiceMessage.size > 5 * 1024 * 1024) {
          setConversationFailure({
            contactId: selectedContactId,
            message: "Voice recordings must be smaller than 5 MB.",
          });
          return;
        }
        setVoiceDraft(voiceMessage);
        setConversationFailure(null);
      };
      recorderRef.current = recorder;
      recordingContactIdRef.current = selectedContactId;
      recorder.start();
      setVoiceDraft(null);
      setRecording(true);
      setConversationFailure(null);
    } catch (recordingError) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setConversationFailure({
        contactId: selectedContactId,
        message: recordingError instanceof Error
          ? recordingError.message
          : "Unable to access the microphone.",
      });
    }
  }

  function handleStopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function handleSendVoice() {
    if (!voiceDraft || !selectedContactId || sending) return;
    const contactId = selectedContactId;
    setSending(true);
    setConversationFailure(null);
    try {
      const sentMessage = await sendVoiceMessage(contactId, voiceDraft);
      setMessages((current) =>
        messagesForContact === contactId
          ? [...current, sentMessage]
          : [sentMessage],
      );
      setMessagesForContact(contactId);
      setVoiceDraft(null);
      setContacts((current) =>
        current.map((contact) =>
          contact.customer_id === contactId
            ? {
                ...contact,
                last_message: sentMessage.body,
                last_message_at: sentMessage.created_at,
              }
            : contact,
        ),
      );
    } catch (sendError) {
      setConversationFailure({
        contactId,
        message: sendError instanceof Error
          ? sendError.message
          : "Unable to send your voice message.",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleLoadVoice(contactId: string, messageId: string) {
    setLoadingVoiceId(messageId);
    try {
      const audio = await getVoiceMessageAudio(contactId, messageId);
      const url = URL.createObjectURL(audio);
      voiceUrlsRef.current.push(url);
      setVoiceUrls((current) => ({ ...current, [messageId]: url }));
    } catch (audioError) {
      setConversationFailure({
        contactId,
        message: audioError instanceof Error
          ? audioError.message
          : "Unable to load this voice message.",
      });
    } finally {
      setLoadingVoiceId(null);
    }
  }

  const selectedContact =
    contacts.find((contact) => contact.customer_id === selectedContactId) ?? null;

  if (loading) {
    return (
      <Container className="direct-messages-page">
        <p className="direct-messages-message">Loading messages...</p>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="direct-messages-page">
        <section className="direct-messages-message">
          <h1>Sign in to view messages</h1>
          <p>{error}</p>
          <Link to="/login">Go to sign in</Link>
        </section>
      </Container>
    );
  }

  return (
    <Container
      className={`direct-messages-page${isClientPage ? " client-messages-page" : ""}`}
    >
      <header className="direct-messages-header">
        <div>
          {isClientPage ? (
            <>
              <p className="direct-messages-eyebrow">Client message center</p>
              <h1>Talk to the INDKAN team</h1>
              <p>
                Your private conversation with our team. Send text or voice
                messages and get replies here.
              </p>
            </>
          ) : (
            <>
              <p className="direct-messages-eyebrow">INDKAN inbox</p>
              <h1>Messages</h1>
              <p>
                Send a message to a client. New messages refresh automatically.
                Messages and voice recordings are deleted after three months.
              </p>
            </>
          )}
        </div>
        {isClientPage && (
          <div className="client-messages-retention">
            Conversations are automatically removed after 3 months.
          </div>
        )}
      </header>

      {error && <p className="direct-messages-error" role="alert">{error}</p>}

      <section
        className={`direct-messages-inbox${isClientPage ? " client-messages-inbox" : ""}`}
        aria-label={isClientPage ? "Client message center" : "Message inbox"}
      >
        <aside className="direct-messages-contacts" aria-label="Contacts">
          <h2>{isClientPage ? "INDKAN contacts" : "Client profiles"}</h2>
          {contacts.length === 0 ? (
            <p className="direct-messages-empty">
              {isClientPage
                ? "No owner contacts are available yet. Please contact support."
                : "No client accounts are available yet."}
            </p>
          ) : (
            <div className="direct-messages-profile-picker">
              <label htmlFor="direct-message-contact-search">
                {isClientPage ? "Find a team contact" : "Search clients by name or ID"}
                <input
                  id="direct-message-contact-search"
                  type="search"
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.currentTarget.value)}
                  placeholder={
                    isClientPage
                      ? "Search INDKAN contacts"
                      : "Enter a client name or ID"
                  }
                />
              </label>
              <label htmlFor="direct-message-contact">
                {isClientPage ? "Choose who to contact" : "Select a client profile"}
                <select
                  id="direct-message-contact"
                  value={selectedContactId ?? ""}
                  onChange={(event) =>
                    (() => {
                      if (recorderRef.current?.state === "recording") {
                        recorderRef.current.stop();
                      }
                      setVoiceDraft(null);
                      setDraft("");
                      setSelectedContactId(event.currentTarget.value || null);
                    })()
                  }
                >
                  <option value="">Choose a profile</option>
                  {filteredContacts.map((contact) => (
                    <option key={contact.customer_id} value={contact.customer_id}>
                      {contact.full_name}
                      {!isClientPage && ` — ID ${contact.customer_id}`}
                      {contact.unread_count > 0
                        ? ` (${contact.unread_count} unread)`
                        : ""}
                    </option>
                  ))}
                  {selectedContact &&
                    !filteredContacts.some(
                      (contact) => contact.customer_id === selectedContact.customer_id,
                    ) && (
                      <option value={selectedContact.customer_id}>
                        {selectedContact.full_name} — ID {selectedContact.customer_id}
                      </option>
                    )}
                </select>
              </label>
              {filteredContacts.length === 0 && (
                <p className="direct-messages-empty">
                  No profiles match that name or ID.
                </p>
              )}
            </div>
          )}
        </aside>

        <section className="direct-messages-conversation" aria-label="Conversation">
          {selectedContact ? (
            <>
              <header className="direct-messages-conversation-header">
                <div>
                  <h2>{selectedContact.full_name}</h2>
                  {isClientPage ? (
                    <p>INDKAN customer support</p>
                  ) : (
                    <p>Client ID: {selectedContact.customer_id}</p>
                  )}
                </div>
              </header>
              {conversationError && (
                <p className="direct-messages-error" role="alert">
                  {conversationError}
                </p>
              )}
              <div
                className="direct-messages-history"
                aria-live="polite"
                aria-label="Conversation messages"
              >
                {visibleMessages.length === 0 && !conversationError ? (
                  <p className="direct-messages-empty">
                    No messages yet. Send a message to start the conversation.
                  </p>
                ) : (
                  visibleMessages.map((message) => {
                    const isOwnMessage = message.sender_id === user.customer_id;
                    return (
                      <article
                        className={`direct-message${isOwnMessage ? " direct-message-own" : ""}`}
                        key={message.message_id}
                      >
                        {message.audio_url ? (
                          voiceUrls[message.message_id] ? (
                            <audio
                              controls
                              preload="none"
                              src={voiceUrls[message.message_id]}
                              aria-label="Voice message"
                            />
                          ) : (
                            <button
                              className="direct-message-audio-button"
                              type="button"
                              disabled={loadingVoiceId === message.message_id}
                              onClick={() =>
                                void handleLoadVoice(
                                  selectedContact.customer_id,
                                  message.message_id,
                                )
                              }
                            >
                              {loadingVoiceId === message.message_id
                                ? "Loading voice message..."
                                : "Play voice message"}
                            </button>
                          )
                        ) : (
                          <p>{message.body}</p>
                        )}
                        <time dateTime={message.created_at}>
                          {formatMessageTime(message.created_at)}
                        </time>
                      </article>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
              <form className="direct-messages-compose" onSubmit={handleSend}>
                <label className="direct-messages-sr-only" htmlFor="direct-message-input">
                  Write a message
                </label>
                <textarea
                  id="direct-message-input"
                  rows={2}
                  maxLength={4000}
                  value={draft}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  placeholder="Write a message..."
                  required
                />
                <button
                  className="owner-primary-button"
                  type="submit"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? "Sending..." : "Send message"}
                </button>
                <button
                  className="direct-messages-record-button"
                  type="button"
                  disabled={sending || !selectedContactId}
                  onClick={recording ? handleStopRecording : () => void handleStartRecording()}
                >
                  {recording ? "Stop recording" : "Record voice"}
                </button>
              </form>
              {recording && (
                <p className="direct-messages-recording" role="status">
                  Recording voice message...
                </p>
              )}
              {voiceDraft && voiceDraftUrl && (
                <div className="direct-messages-voice-draft">
                  <audio controls preload="metadata" src={voiceDraftUrl} aria-label="Voice message preview" />
                  <button
                    className="owner-primary-button"
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSendVoice()}
                  >
                    {sending ? "Sending..." : "Send voice message"}
                  </button>
                  <button
                    className="direct-messages-cancel-recording"
                    type="button"
                    disabled={sending}
                    onClick={() => setVoiceDraft(null)}
                  >
                    Discard
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="direct-messages-empty">
              Select a contact to read or send messages.
            </p>
          )}
        </section>
      </section>
    </Container>
  );
}

export default DirectMessages;
