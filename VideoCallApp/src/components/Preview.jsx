import React, { useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { SOCKET_EVENTS } from "../redux/socketEvents";
import { useTrackStatus } from "../hooks/useTrackStatus";
import { VideoTile } from "./VideoTile";
import { NiceAvatar } from "./CharacterAvatars";
import { Icon } from "./Icon";

export const Preview = ({ setConnected }) => {
  const { roomID } = useParams();
  const [state, dispatch] = useContext(ReduxContext);
  const { joinRoomFunc, peerReady, socket } = useContext(SocketContext);
  const { localStream } = state;
  const [name, setName] = useState("");
  const [peerCount, setPeerCount] = useState(null);
  const { status: trackStatus, toggleTrack } = useTrackStatus(localStream);

  useEffect(() => {
    if (!socket || !roomID) return;
    socket.emit(SOCKET_EVENTS.CHECK_ROOM, { roomID }, ({ count }) => {
      setPeerCount(count);
    });
  }, [socket, roomID]);

  const joinRoom = () => {
    dispatch({ type: "SET_NAME", payload: name.trim() });
    joinRoomFunc(roomID);
    setConnected(true);
  };

  return (
    <div className="app-main">
      <div className="preview-main">
        <div className="preview-content">
          <div className="cam-frame">
            <div className="cam-screen">
              {localStream && trackStatus.video ? (
                <VideoTile stream={localStream} isLocal />
              ) : (
                <NiceAvatar id="local" className="cam-avatar" size={64} />
              )}
              <div className="cam-ctrls">
                <button
                  className={`cam-ctrl-btn ${trackStatus.audio ? "on" : "off"}`}
                  onClick={() => toggleTrack("audio")}
                  aria-label={trackStatus.audio ? "Mute microphone" : "Unmute microphone"}
                >
                  <Icon name={trackStatus.audio ? "mic" : "micOff"} width={12} height={12} />
                </button>
                <button
                  className={`cam-ctrl-btn ${trackStatus.video ? "on" : "off"}`}
                  onClick={() => toggleTrack("video")}
                  aria-label={trackStatus.video ? "Turn camera off" : "Turn camera on"}
                >
                  <Icon name={trackStatus.video ? "cam" : "camOff"} width={12} height={12} />
                </button>
              </div>
            </div>
          </div>

          <div className="preview-foot">
            <div className="preview-name-lbl">Your name</div>
            <input
              className="preview-name-input"
              placeholder="Enter your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="preview-join"
              onClick={joinRoom}
              disabled={!localStream || !peerReady || !name.trim()}
            >
              Join Meeting
              <Icon name="arrowRight" width={13} height={13} strokeWidth={2.5} />
            </button>
          </div>

          {peerCount > 0 && (
            <div className="room-people">
              <div className="rp-label">
                {peerCount} {peerCount === 1 ? "other" : "others"} already in this room
              </div>
              <div className="rp-avatars">
                {Array.from({ length: Math.min(peerCount, 5) }).map((_, i) => (
                  <NiceAvatar key={i} id={`${roomID}-${i}`} className="rp-avatar" size={22} />
                ))}
                {peerCount > 5 && <div className="rp-more">+{peerCount - 5}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
