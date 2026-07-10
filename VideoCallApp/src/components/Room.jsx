import React, { useContext, useMemo } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";
import { NiceAvatar } from "./CharacterAvatars";
import { Icon } from "./Icon";

const gridLayout = (length) => {
  for (let i = 1; i < 6; i += 1) {
    for (let j = i; j <= i + 1; j += 1) {
      if (i * j >= length) return { rows: i, columns: j };
    }
  }
  return { rows: 5, columns: 6 };
};

export const Room = ({ captionsOn }) => {
  const [state] = useContext(ReduxContext);
  const { connections, localStream, name } = state;

  const localMuted = !localStream?.getAudioTracks?.()[0]?.enabled;
  const peers = useMemo(() => Object.values(connections), [connections]);

  const tiles = useMemo(() => {
    const list = [];
    list.push({
      key: "you",
      name: name ? `You (${name})` : "You",
      stream: localStream,
      speaking: false,
      muted: localMuted,
      isLocal: true,
    });
    peers.forEach((conn) => {
      const shortId = conn.peer?.slice(-4)?.toUpperCase() ?? "??";
      const peerMuted = !conn.remoteStream?.getAudioTracks?.()[0]?.enabled;
      list.push({
        key: conn.peer || shortId,
        name: conn.name || shortId,
        stream: conn.remoteStream,
        speaking: false,
        avatarId: conn.peer,
        muted: peerMuted,
        isLocal: false,
      });
    });
    return list;
  }, [peers, localStream, name, localMuted]);

  const { rows, columns } = useMemo(() => gridLayout(tiles.length), [tiles.length]);

  return (
    <div className="meeting-main">
      <div
        className="video-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={`v-tile ${tile.speaking ? "speaking" : ""}`}
          >
            {tile.stream ? (
              <VideoTile stream={tile.stream} isLocal={tile.isLocal} />
            ) : tile.isLocal ? (
              <NiceAvatar id="local" className="cam-avatar" size={64} />
            ) : (
              <NiceAvatar id={tile.avatarId} className="cam-avatar" size={64} />
            )}
            {tile.name && <span className="v-name">{tile.name}</span>}
            {tile.muted && (
              <div className="v-muted">
                <Icon name="micOff" width={10} height={10} strokeWidth={2.5} />
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
