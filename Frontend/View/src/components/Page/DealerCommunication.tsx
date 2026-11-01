import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Dealer } from "../../services/dealers";
import "../../styles/page/DealerCommunication.css";

type DealerCommunicationProps = {
  dealer: Dealer;
  onClose: () => void;
};

function DealerCommunication({ dealer, onClose }: DealerCommunicationProps) {
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (voiceNoteUrl) URL.revokeObjectURL(voiceNoteUrl);
    },
    [voiceNoteUrl],
  );

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = message.trim();
    if (!body) return;
    window.location.href = `mailto:${encodeURIComponent(dealer.email)}?subject=${encodeURIComponent(`Message about contract ${dealer.contractNumber}`)}&body=${encodeURIComponent(body)}`;
  }

  async function toggleRecording() {
    setVoiceError("");
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setVoiceNoteUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(audio);
        });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.start();
      setRecording(true);
    } catch (recordError) {
      setVoiceError(
        recordError instanceof Error
          ? recordError.message
          : "Microphone access was not available.",
      );
    }
  }

  function prepareVoiceEmail() {
    if (!voiceNoteUrl) return;
    const anchor = document.createElement("a");
    anchor.href = voiceNoteUrl;
    anchor.download = `voice-note-${dealer.contractNumber}.webm`;
    anchor.click();
    window.location.href = `mailto:${encodeURIComponent(dealer.email)}?subject=${encodeURIComponent(`Voice message about contract ${dealer.contractNumber}`)}&body=${encodeURIComponent("I recorded a voice message for you. Please find the downloaded voice-note file attached to this email.")}`;
  }

  return (
    <div className="dealer-chat-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="dealer-chat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dealer-chat-title"
      >
        <header className="dealer-chat-header">
          <div>
            <p>Contract {dealer.contractNumber}</p>
            <h2 id="dealer-chat-title">Contact {dealer.name}</h2>
          </div>
          <button
            className="dealer-chat-close"
            type="button"
            aria-label="Close communication panel"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <p className="dealer-chat-notice">
          Messages and calls use your email or phone app. This site does not provide
          live chat or call signaling.
        </p>
        <form className="dealer-chat-form" onSubmit={sendMessage}>
          <label htmlFor="dealer-message">Message</label>
          <textarea
            id="dealer-message"
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a message to the dealer..."
            required
          />
          <button className="owner-primary-button" type="submit">
            Send by email
          </button>
        </form>

        <div className="dealer-voice-tools">
          <h3>Voice message</h3>
          <button
            className={recording ? "dealer-record-button dealer-recording" : "dealer-record-button"}
            type="button"
            onClick={() => void toggleRecording()}
          >
            {recording ? "Stop recording" : "Record voice message"}
          </button>
          {voiceNoteUrl && (
            <div className="dealer-voice-preview">
              <audio controls src={voiceNoteUrl}>Audio playback is not supported.</audio>
              <button
                className="owner-secondary-link"
                type="button"
                onClick={prepareVoiceEmail}
              >
                Download &amp; prepare email
              </button>
              <p>Attach the downloaded recording to the email to send it.</p>
            </div>
          )}
          {voiceError && <p className="owner-error" role="alert">{voiceError}</p>}
        </div>

        <div className="dealer-call-tools">
          {dealer.phone ? (
            <a className="owner-secondary-link" href={`tel:${dealer.phone}`}>
              Call {dealer.name}
            </a>
          ) : (
            <p>Add a phone number to this dealer in the Owner dashboard to enable calling.</p>
          )}
          <a href={`mailto:${dealer.email}`}>{dealer.email}</a>
        </div>
      </section>
    </div>
  );
}

export default DealerCommunication;
