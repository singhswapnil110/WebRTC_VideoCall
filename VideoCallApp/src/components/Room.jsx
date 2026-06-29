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

const CaptionLine = ({ caption }) => {
  if (!caption) return null;
  return (
    <>
      <span className="caption-speaker">{caption.senderName}:</span>
      {caption.text}
    </>
  );
};

export const Room = ({
  captionsOn,
  captionStatus = "idle",
  currentCaption,
  previousCaption,
  outputSinkId = "",
}) => {
  const [state] = useContext(ReduxContext);
  const { connections, localStream, name, raisedHands } = state;

  const localMuted = !localStream?.getAudioTracks?.()[0]?.enabled;
  const peers = useMemo(() => Object.values(connections), [connections]);
  const statusCaption = captionsOn && !currentCaption
    ? captionStatus === "loading"
      ? "Preparing live captions…"
      : captionStatus === "ready"
        ? "Captions ready"
        : null
    : null;

  const tiles = useMemo(() => {
    const list = [];
    list.push({
      key: "you",
      name: name ? `You (${name})` : "You",
      stream: localStream,
      speaking: false,
      muted: localMuted,
      isLocal: true,
      handRaised: Boolean(
        raisedHands.local?.raised ||
        Object.values(raisedHands).find((hand) => hand.userName === (name || "You"))?.raised
      ),
      isScreenSharing: Boolean(localStream?.getVideoTracks?.()[0]?.getSettings?.().displaySurface),
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
        handRaised: Boolean(raisedHands[conn.peer]?.raised),
        isScreenSharing: false,
      });
    });
    return list;
  }, [peers, localStream, name, localMuted, raisedHands]);

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
              <VideoTile stream={tile.stream} isLocal={tile.isLocal} sinkId={tile.isLocal ? "" : outputSinkId} />
            ) : tile.isLocal ? (
              <NiceAvatar id="local" className="cam-avatar" size={64} />
            ) : (
              <NiceAvatar id={tile.avatarId} className="cam-avatar" size={64} />
            )}
            {tile.name && <span className="v-name">{tile.name}</span>}
            {tile.isScreenSharing && (
              <div className="v-share">
                <Icon name="share" width={10} height={10} strokeWidth={2.5} />
              </div>
            )}
            {tile.handRaised && (
              <div className="v-hand">
                <Icon name="hand" width={10} height={10} strokeWidth={2.2} />
              </div>
            )}
            {tile.muted && (
              <div className="v-muted">
                <Icon name="micOff" width={10} height={10} strokeWidth={2.5} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`captions-bar ${captionsOn ? "active" : ""}`}>
        {captionsOn && previousCaption && (
          <div className="caption-prev">
            <CaptionLine caption={previousCaption} />
          </div>
        )}
        {captionsOn && currentCaption && (
          <div className={`caption-cur ${currentCaption.isFinal ? "is-final" : "is-live"}`}>
            <CaptionLine caption={currentCaption} />
          </div>
        )}
        {captionsOn && statusCaption && (
          <div className="caption-status">{statusCaption}</div>
        )}
      </div>
    </div>
  );
};
