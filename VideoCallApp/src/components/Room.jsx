import React, { useContext } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";
import {
  BoyAvatar, GirlAvatar, AlienAvatar, MonsterAvatar,
  RobotAvatar, CatAvatar, PinkGirlAvatar, TealAndroidAvatar, CuteCreatureAvatar,
} from "./CharacterAvatars";

const peerHue = (id = "") => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return h % 360;
};

/* Map peer index to a 3D avatar component */
const peerAvatars = [
  GirlAvatar,     // 0
  AlienAvatar,    // 1
  MonsterAvatar,  // 2
  RobotAvatar,    // 3
  CatAvatar,      // 4
  PinkGirlAvatar, // 5
  TealAndroidAvatar, // 6
  CuteCreatureAvatar, // 7
];

export const Room = ({ captionsOn }) => {
  const { connections, localStream } = useContext(ReduxContext)[0];
  const peerList = Object.values(connections);

  /* Show up to 9 tiles (3×3) */
  const tiles = [];
  // You
  tiles.push({ key: "you", name: "You", stream: localStream, speaking: true });
  // Peers
  peerList.forEach((conn, i) => {
    const shortId = conn.peer?.slice(-4)?.toUpperCase() ?? "??";
    tiles.push({
      key: conn.peer || `peer-${i}`,
      name: shortId,
      stream: conn.remoteStream,
      speaking: false,
      avatarIndex: i,
      muted: i === 0 || i === 2 || i === 3 || i === 5 || i === 7, // some random muted states
    });
  });

  // Pad to fill up to 9 slots
  while (tiles.length < 9) {
    tiles.push({ key: `empty-${tiles.length}`, empty: true });
  }

  const AvatarForIndex = (index) => {
    const Avatar = peerAvatars[index % peerAvatars.length];
    return <Avatar size={48} />;
  };

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
            ) : tile.name === "You" ? (
              <BoyAvatar size={48} />
            ) : (
              AvatarForIndex(tile.avatarIndex)
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

      {/* Captions bar */}
      <div className={`captions-bar ${captionsOn ? "active" : ""}`}>
        {captionsOn && (
          <>
            <div className="caption-prev">
              <span className="caption-speaker">Priya:</span> so the timeline we discussed last week—
            </div>
            <div className="caption-cur">
              <span className="caption-speaker">You:</span> Right, we need to push the deadline by a week to account for the testing phase.
            </div>
          </>
        )}
      </div>
    </div>
  );
};
