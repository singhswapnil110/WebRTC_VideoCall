import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";
import { BoyAvatar } from "./CharacterAvatars";
import { RpGirlAvatar, RpAlienAvatar, RpMonsterAvatar, RpRobotAvatar, RpCatAvatar } from "./CharacterAvatars";

export const Preview = ({ setConnected }) => {
  const { roomID } = useParams();
  const state = useContext(ReduxContext)[0];
  const { joinRoomFunc, peerReady } = useContext(SocketContext);
  const { localStream } = state;
  const [name, setName] = useState("");

  const joinRoom = () => {
    joinRoomFunc(roomID);
    setConnected(true);
  };

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn(!camOn);
  };

  return (
    <div className="app-main">
      <div className="preview-main">
        <div className="preview-content">
          <div className="cam-frame">
            <div className="cam-screen">
              {localStream && camOn ? (
                <VideoTile stream={localStream} />
              ) : (
                <BoyAvatar size={64} />
              )}
              <div className="cam-ctrls">
                <button className={`cam-ctrl-btn ${micOn ? "on" : "off"}`} onClick={toggleMic}>
                  {micOn ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>
                <button className={`cam-ctrl-btn ${camOn ? "on" : "off"}`} onClick={toggleCam}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>

          <div className="room-people">
            <div className="rp-label">5 others already in this room</div>
            <div className="rp-avatars">
              <RpGirlAvatar />
              <RpAlienAvatar />
              <RpMonsterAvatar />
              <RpRobotAvatar />
              <RpCatAvatar />
              <div className="rp-more">+2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
