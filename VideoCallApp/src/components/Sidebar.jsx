import React, { useState, useContext, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { Icon } from "./Icon";

export const Sidebar = ({
  isPreview,
  panels,
  onTogglePanel,
  messageCount,
  trackStatus,
  toggleTrack,
  captionsSupported = true,
  captionStatus = "idle",
  captionError,
  deviceOptions,
  onSelectDevice,
  onToggleScreenShare,
  isScreenSharing,
  onToggleRaisedHand,
  raisedHand,
  outputSwitchSupported,
}) => {
  const [state] = useContext(ReduxContext);
  const { leaveRoomFunc } = useContext(SocketContext);
  const { localStream } = state;
  const { roomID } = useParams();
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!sidebarRef.current || !sidebarRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const leaveRoom = () => {
    leaveRoomFunc();
    navigate("/");
  };

  const copyRoomLink = () => {
    if (!roomID) return;
    const roomLink = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard.writeText(roomLink).catch(() => {});
  };

  const toggleDropdown = (id) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  const slotBg = isPreview ? "prev-slot" : "meet-slot";
  const captionsTip = !captionsSupported
    ? "Live captions unavailable in this browser"
    : captionStatus === "loading"
      ? "Loading caption model"
      : panels.captions
        ? "Turn captions off"
        : captionError?.code === "not-allowed"
          ? "Microphone speech access blocked"
          : "Turn captions on";

  const meetingButtons = [
    {
      key: "share",
      tip: isScreenSharing ? "Stop sharing" : "Share screen",
      icon: "share",
      active: isScreenSharing,
      onClick: onToggleScreenShare,
    },
    { key: "chat", tip: "Chat", icon: "chat", active: panels.chat, onClick: () => onTogglePanel("chat"), badge: messageCount },
    { key: "participants", tip: "Participants", icon: "participants", active: panels.participants, onClick: () => onTogglePanel("participants") },
    {
      key: "hand",
      tip: raisedHand ? "Lower hand" : "Raise hand",
      icon: "hand",
      active: raisedHand,
      onClick: onToggleRaisedHand,
    },
    {
      key: "captions",
      tip: captionsTip,
      icon: "captions",
      active: panels.captions,
      onClick: () => onTogglePanel("captions"),
      disabled: !captionsSupported,
      subdued: !captionsSupported,
    },
    { key: "translate", tip: "Live translate", icon: "translate", active: panels.translate, onClick: () => onTogglePanel("translate") },
  ];

  const deviceControls = [
    { key: "mic", kind: "audio", icon: trackStatus.audio ? "mic" : "micOff", active: trackStatus.audio, tip: trackStatus.audio ? "Mute mic" : "Unmute mic" },
    { key: "cam", kind: "video", icon: trackStatus.video ? "cam" : "camOff", active: trackStatus.video, tip: trackStatus.video ? "Camera on" : "Camera off" },
    { key: "spk", kind: null, icon: "volume", active: true, tip: outputSwitchSupported ? "Audio output" : "Audio output not supported" },
  ];

  return (
    <div className={`sidebar-slot ${slotBg}`}>
      <div className="sidebar" ref={sidebarRef}>
        {!isPreview && (
          <div className="sb-top">
            {meetingButtons.map((btn) => (
              <button
                key={btn.key}
                className={`sb-btn ${btn.active ? "is-active" : ""} ${btn.subdued ? "is-subdued" : ""}`}
                data-tip={btn.tip}
                onClick={btn.onClick}
                aria-label={btn.tip}
                disabled={btn.disabled}
              >
                {btn.badge > 0 && <div className="sb-badge">{btn.badge}</div>}
                <Icon name={btn.icon} />
              </button>
            ))}
          </div>
        )}

        {!isPreview && <div className="sb-sep" />}

        <div className="sb-mid">
          {deviceControls.map((ctrl) => (
            <div className="sb-split" key={ctrl.key}>
              <button
                className={`sb-icon-btn ${ctrl.active ? "is-active" : "is-off"}`}
                data-tip={ctrl.tip}
                aria-label={ctrl.tip}
                onClick={() => ctrl.kind && toggleTrack(ctrl.kind)}
                disabled={ctrl.kind && !localStream}
              >
                <Icon name={ctrl.icon} />
              </button>
              <button
                className="sb-chev-btn"
                aria-label={`${ctrl.key} options`}
                onClick={() => toggleDropdown(`${ctrl.key}-dd-${isPreview ? "prev" : "meet"}`)}
              >
                <Icon name="chevron" width={7} height={7} strokeWidth={3.5} />
              </button>
              <Dropdown
                id={`${ctrl.key}-dd-${isPreview ? "prev" : "meet"}`}
                open={openDropdown === `${ctrl.key}-dd-${isPreview ? "prev" : "meet"}`}
                label={ctrl.key === "mic" ? "Microphone" : ctrl.key === "cam" ? "Camera" : "Speaker / Output"}
                items={deviceOptions?.[ctrl.key] || []}
                onSelect={(value) => {
                  if (!value) return;
                  if (ctrl.key === "spk" && !outputSwitchSupported) return;
                  onSelectDevice?.(
                    ctrl.key === "mic" ? "audioinput" : ctrl.key === "cam" ? "videoinput" : "audiooutput",
                    value
                  );
                  setOpenDropdown(null);
                }}
              />
            </div>
          ))}
        </div>

        <div className="sb-sep" />

        <div className="sb-bot">
          {isPreview && (
            <button className="sb-btn" data-tip="Copy link" aria-label="Copy link" onClick={copyRoomLink}>
              <Icon name="copy" />
            </button>
          )}
          <button className="sb-btn is-danger" data-tip="Leave room" aria-label="Leave room" onClick={leaveRoom}>
            <Icon name="leave" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Dropdown = ({ open, label, items, onSelect }) => {
  if (!open) return null;
  return (
    <div className="sb-dropdown open">
      <div className="sb-dd-label">{label}</div>
      {items.map((item) => (
        <button
          key={item.value || item.label}
          type="button"
          className={`sb-dd-item ${item.active ? "active" : ""}`}
          onClick={() => !item.disabled && onSelect?.(item.value)}
          disabled={item.disabled}
        >
          {item.active ? (
            <div className="sb-dd-check">
              <Icon name="check" width={8} height={8} strokeWidth={3} />
            </div>
          ) : (
            <div className="sb-dd-dot" />
          )}
          <span>{item.label}</span>
          {item.disabled && <span className="sb-dd-meta">Unavailable</span>}
        </button>
      ))}
      {items.length === 0 && <div className="sb-dd-empty">No devices found</div>}
    </div>
  );
};

export const __testables__ = { Dropdown };
