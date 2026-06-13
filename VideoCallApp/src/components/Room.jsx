import React, { useContext } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";
import { NiceAvatar } from "./CharacterAvatars";

export const Room = ({ captionsOn }) => {
  const [state] = useContext(ReduxContext);
  const { connections, localStream, name } = state;
  const peerList = Object.values(connections);

  const tiles = [];
  const localMuted = !localStream?.getAudioTracks?.()[0]?.enabled;
  tiles.push({ key: "you", name: name ? `You (${name})` : "You", stream: localStream, speaking: false, muted: localMuted, isLocal: true });

  peerList.forEach((conn) => {
    const shortId = conn.peer?.slice(-4)?.toUpperCase() ?? "??";
    const peerMuted = !conn.remoteStream?.getAudioTracks?.()[0]?.enabled;
    tiles.push({
      key: conn.peer || shortId,
      name: shortId,
      stream: conn.remoteStream,
      speaking: false,
      avatarId: conn.peer,
      muted: peerMuted,
    });
  });

  while (tiles.length < 9) {
    tiles.push({ key: `empty-${tiles.length}`, empty: true });
  }

  return (
    <div className="meeting-main">
      <div className="video-grid">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={`v-tile ${tile.speaking ? "speaking" : ""}`}
          >
            {tile.empty ? null : tile.stream ? (
              <VideoTile stream={tile.stream} />
            ) : tile.isLocal ? (
              <NiceAvatar id="local" className="cam-avatar" size={64} />
            ) : (
              <NiceAvatar id={tile.avatarId} className="cam-avatar" size={64} />
            )}
            {tile.name && <span className="v-name">{tile.name}</span>}
            {tile.muted && (
              <div className="v-muted">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`captions-bar ${captionsOn ? "active" : ""}`}>
        {captionsOn && (
          <>
            <div className="caption-prev">
              <span className="caption-speaker">Live captions enabled</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
