import React, { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon";

export const ChatPanel = ({ onClose, messages, onSendMessage }) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !onSendMessage) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Chat</span>
        <button className="panel-close" onClick={onClose} aria-label="Close chat">
          <Icon name="close" width={14} height={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-msg ${msg.me ? "me" : ""}`}>
              <span className="chat-msg-name">{msg.senderName || msg.name}</span>
              <div className="chat-bubble">{msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-wrap" onSubmit={sendMessage}>
        <input
          className="chat-input"
          placeholder="Send a message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!message.trim()}
          aria-label="Send message"
        >
          <Icon name="arrowRight" width={13} height={13} />
        </button>
      </form>
    </>
  );
};
