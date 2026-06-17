import React from "react";
import { NiceAvatar } from "./CharacterAvatars";
import { Icon } from "./Icon";

export const ParticipantsPanel = ({ onClose, participants, localUser }) => {
  const all = localUser ? [localUser, ...participants] : participants;

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Participants ({all.length})</span>
        <button className="panel-close" onClick={onClose} aria-label="Close participants">
          <Icon name="close" width={14} height={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="part-list">
        {all.map((p) => (
          <div key={p.id} className="part-item">
            <NiceAvatar id={p.id} className="part-avatar" size={18} />
            <span className="part-name">{p.name}</span>
            <div className={`part-mic ${p.muted ? "muted" : "live"}`} aria-label={p.muted ? "Muted" : "Live"}>
              <Icon name={p.muted ? "micOff" : "mic"} width={12} height={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
