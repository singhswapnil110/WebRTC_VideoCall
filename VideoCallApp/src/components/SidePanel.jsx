import React, { useState } from "react";
import { NiceAvatar } from "./CharacterAvatars";

/* Reusable slide-in panel for Chat, Participants, Live Translate */

export const ChatPanel = ({ open, onClose, messages, onSendMessage }) => {
  const [message, setMessage] = useState("");

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !onSendMessage) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <div className="panel-head">
        <span className="panel-title">Chat</span>
        <button className="panel-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.me ? "me" : ""}`}>
            <span className="chat-msg-name">{msg.senderName || msg.name}</span>
            <div className="chat-bubble">{msg.text}</div>
          </div>
        ))}
      </div>
      <form className="chat-input-wrap" onSubmit={sendMessage}>
        <input
          className="chat-input"
          placeholder="Send a message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </form>
    </div>
  );
};

const micMutedSvg = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const micLiveSvg = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

export const ParticipantsPanel = ({ open, onClose, participants, localUser }) => {
  const all = localUser ? [localUser, ...participants] : participants;
  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <div className="panel-head">
        <span className="panel-title">Participants ({all.length})</span>
        <button className="panel-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="part-list">
        {all.map((p) => (
          <div key={p.id} className="part-item">
            <NiceAvatar id={p.id} className="part-avatar" size={18} />
            <span className="part-name">{p.name}</span>
            <div className={`part-mic ${p.muted ? "muted" : "live"}`}>
              {p.muted ? micMutedSvg : micLiveSvg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TranslatePanel = ({ open, onClose }) => {
  const [speaking, setSpeaking] = useState("English");
  const [translateTo, setTranslateTo] = useState("Hindi");
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    "Auto-detect", "English", "Hindi", "Tamil", "Telugu",
    "Marathi", "Bengali", "Gujarati", "Punjabi", "Kannada",
    "Malayalam", "French", "Spanish", "German", "Japanese",
    "Mandarin", "Arabic",
  ];

  const targetLanguages = languages.filter((l) => l !== "Auto-detect");

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <div className="panel-head">
        <span className="panel-title">Live Translate</span>
        <button className="panel-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="translate-body">
        <div className="tl-field">
          <div className="tl-label">Speaking in</div>
          <select className="tl-select" value={speaking} onChange={(e) => setSpeaking(e.target.value)}>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="tl-divider">into</div>
        <div className="tl-field">
          <div className="tl-label">Translate to</div>
          <select className="tl-select" value={translateTo} onChange={(e) => setTranslateTo(e.target.value)}>
            {targetLanguages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <button
          className="tl-start-btn"
          onClick={() => setIsTranslating(!isTranslating)}
        >
          {isTranslating ? "Stop Translation" : "Start Translation"}
        </button>
      </div>
    </div>
  );
};
