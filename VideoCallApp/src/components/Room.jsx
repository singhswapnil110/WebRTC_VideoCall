import React, { useContext } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";

const gridLayout = (length) => {
  for (let i = 1; i < 6; i++)
    for (let j = i; j <= i + 1; j++)
      if (i * j >= length) return { rows: i, columns: j };
  return { rows: 5, columns: 6 };
};

// Derive a hue from a string for consistent avatar colors per peer
const peerHue = (id = "") => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return h % 360;
};

export const Room = () => {
  const { connections, localStream } = useContext(ReduxContext)[0];
  const peerList = Object.values(connections);
  const { rows, columns } = gridLayout(peerList.length + 1);

  return (
    <div className="meeting-room-bg">
      <div
        className="video-grid-wrap"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {/* Local tile */}
        <div className="v-tile">
          {localStream ? (
            <VideoTile stream={localStream} />
          ) : (
            <div
              className="v-avatar"
              style={{ background: `linear-gradient(135deg, hsl(260,70%,40%), hsl(280,80%,65%))` }}
            >
              Me
            </div>
          )}
          <span className="v-name">You</span>
        </div>

        {/* Remote tiles */}
        {peerList.map((conn) => {
          const hue = peerHue(conn.peer);
          const shortId = conn.peer?.slice(-4)?.toUpperCase() ?? "??";
          return (
            <div key={conn.peer} className="v-tile">
              {conn.remoteStream ? (
                <VideoTile stream={conn.remoteStream} />
              ) : (
                <div
                  className="v-avatar"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue},65%,35%), hsl(${(hue + 30) % 360},75%,60%))`,
                  }}
                >
                  {shortId}
                </div>
              )}
              <span className="v-name">{shortId}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
