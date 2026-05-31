import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";

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

  const initial = name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div className="preview-page">
      <section className="preview-cam-section">
        <div className="cam-frame">
          <div className="cam-screen">
            {localStream ? (
              <VideoTile stream={localStream} />
            ) : (
              <div className="cam-avatar-lg">{initial}</div>
            )}
          </div>
        </div>
      </section>

      <section className="preview-info-section">
        <div className="preview-name-label">Your name</div>
        <input
          className="preview-name-input"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="preview-join-btn"
          onClick={joinRoom}
          disabled={!localStream || !peerReady || !name.trim()}
        >
          Join Meeting
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </section>
    </div>
  );
};
