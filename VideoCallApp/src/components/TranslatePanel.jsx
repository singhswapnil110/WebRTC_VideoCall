import React, { useState } from "react";
import { Icon } from "./Icon";

const languages = [
  "Auto-detect", "English", "Hindi", "Tamil", "Telugu",
  "Marathi", "Bengali", "Gujarati", "Punjabi", "Kannada",
  "Malayalam", "French", "Spanish", "German", "Japanese",
  "Mandarin", "Arabic",
];

const targetLanguages = languages.filter((l) => l !== "Auto-detect");

export const TranslatePanel = ({ onClose }) => {
  const [speaking, setSpeaking] = useState("English");
  const [translateTo, setTranslateTo] = useState("Hindi");
  const [isTranslating, setIsTranslating] = useState(false);

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Live Translate</span>
        <button className="panel-close" onClick={onClose} aria-label="Close translation">
          <Icon name="close" width={14} height={14} strokeWidth={2.5} />
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
        <button className="tl-start-btn" onClick={() => setIsTranslating(!isTranslating)}>
          {isTranslating ? "Stop Translation" : "Start Translation"}
        </button>
      </div>
    </>
  );
};
