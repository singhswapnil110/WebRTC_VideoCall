import React, { useEffect, useState, useContext, useCallback } from "react";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { useNavigate } from "react-router-dom";

export const Sidebar = ({ isPreview, panels, onTogglePanel, messageCount }) => {
  const [trackStatus, setTrackStatus] = useState({ video: true, audio: true });
  const [state] = useContext(ReduxContext);
  const { leaveRoomFunc } = useContext(SocketContext);
  const { localStream, roomID } = state;
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStream) return;
    const status = {};
    localStream.getTracks().forEach((track) => {
      status[track.kind] = track.enabled;
    });
    setTrackStatus(status);
  }, [localStream]);

  const leaveRoom = () => {
    leaveRoomFunc();
    navigate("/");
  };

  const toggleTrack = (kind) => {
    if (!localStream) return;
    localStream.getTracks().forEach((track) => {
      if (track.kind === kind) track.enabled = !track.enabled;
    });
    setTrackStatus((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard.writeText(roomLink).catch(() => {});
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".sb-chev-btn")) {
        document.querySelectorAll(".sb-dropdown").forEach((d) => d.classList.remove("open"));
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const toggleDropdown = (id) => {
    const target = document.getElementById(id);
    if (!target) return;
    const wasOpen = target.classList.contains("open");
    document.querySelectorAll(".sb-dropdown").forEach((d) => d.classList.remove("open"));
    if (!wasOpen) target.classList.add("open");
  };

  const slotBg = isPreview ? "prev-slot" : "meet-slot";

  return (
    <div className={`sidebar-slot ${slotBg}`}>
      <div className="sidebar">
        {/* Top section: meeting controls (only in meeting, not preview) */}
        {!isPreview && (
          <div className="sb-top">
            <button className="sb-btn" data-tip="Share screen">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>
            <button
              className={`sb-btn ${panels.chat ? "is-active" : ""}`}
              data-tip="Chat"
              onClick={() => onTogglePanel("chat")}
            >
              {messageCount > 0 && <div className="sb-badge">{messageCount}</div>}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button
              className={`sb-btn ${panels.participants ? "is-active" : ""}`}
              data-tip="Participants"
              onClick={() => onTogglePanel("participants")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>
            <button className="sb-btn" data-tip="Raise hand">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/>
                <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
              </svg>
            </button>
            <button
              className={`sb-btn ${panels.captions ? "is-active" : ""}`}
              data-tip="Live captions"
              onClick={() => onTogglePanel("captions")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 12h4M7 15h3M13 12h4M13 15h2"/>
              </svg>
            </button>
            <button
              className={`sb-btn ${panels.translate ? "is-active" : ""}`}
              data-tip="Live translate"
              onClick={() => onTogglePanel("translate")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
              </svg>
            </button>
          </div>
        )}

        {!isPreview && <div className="sb-sep" />}

        {/* Device controls */}
        <div className="sb-mid">
          {/* Mic */}
          <div className="sb-split">
            <button
              className={`sb-icon-btn ${!trackStatus.audio ? "is-off" : "is-active"}`}
              data-tip={trackStatus.audio ? "Mute mic" : "Unmute mic"}
              onClick={() => toggleTrack("audio")}
              disabled={!localStream}
            >
              {trackStatus.audio ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
            <button className="sb-chev-btn" onClick={() => toggleDropdown(`mic-dd-${isPreview ? "prev" : "meet"}`)}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="sb-dropdown" id={`mic-dd-${isPreview ? "prev" : "meet"}`}>
              <div className="sb-dd-label">Microphone</div>
              <div className="sb-dd-item active"><div className="sb-dd-check"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>Default Microphone</div>
              <div className="sb-dd-item"><div className="sb-dd-dot"></div>AirPods Pro</div>
              <div className="sb-dd-item"><div className="sb-dd-dot"></div>MacBook Microphone</div>
            </div>
          </div>

          {/* Camera */}
          <div className="sb-split">
            <button
              className={`sb-icon-btn ${!trackStatus.video ? "is-off" : "is-active"}`}
              data-tip={trackStatus.video ? "Camera on" : "Camera off"}
              onClick={() => toggleTrack("video")}
              disabled={!localStream}
            >
              {trackStatus.video ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
            <button className="sb-chev-btn" onClick={() => toggleDropdown(`cam-dd-${isPreview ? "prev" : "meet"}`)}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="sb-dropdown" id={`cam-dd-${isPreview ? "prev" : "meet"}`}>
              <div className="sb-dd-label">Camera</div>
              <div className="sb-dd-item active"><div className="sb-dd-check"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>FaceTime HD Camera</div>
              <div className="sb-dd-item"><div className="sb-dd-dot"></div>OBS Virtual Camera</div>
            </div>
          </div>

          {/* Audio output */}
          <div className="sb-split">
            <button className="sb-icon-btn is-active" data-tip="Audio output">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            </button>
            <button className="sb-chev-btn" onClick={() => toggleDropdown(`spk-dd-${isPreview ? "prev" : "meet"}`)}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="sb-dropdown" id={`spk-dd-${isPreview ? "prev" : "meet"}`}>
              <div className="sb-dd-label">Speaker / Output</div>
              <div className="sb-dd-item active"><div className="sb-dd-check"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>AirPods Pro</div>
              <div className="sb-dd-item"><div className="sb-dd-dot"></div>MacBook Speakers</div>
              <div className="sb-dd-item"><div className="sb-dd-dot"></div>External Monitor</div>
            </div>
          </div>
        </div>

        <div className="sb-sep" />

        {/* Bottom section */}
        <div className="sb-bot">
          {isPreview && (
            <button className="sb-btn" data-tip="Copy link" onClick={copyRoomLink}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          )}
          <button className="sb-btn is-danger" data-tip="Leave room" onClick={leaveRoom}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
