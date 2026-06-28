import React, { useState, useContext, useEffect, useRef, useCallback } from "react";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { useTrackStatus } from "../hooks/useTrackStatus";
import { useCaptionTranscriber } from "../hooks/useCaptionTranscriber";
import { useRoomCaptions } from "../hooks/useRoomCaptions";
import { Preview } from "./Preview";
import { Room } from "./Room";
import { Sidebar } from "./Sidebar";
import { SidePanel } from "./SidePanel";
import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { TranslatePanel } from "./TranslatePanel";

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const [state, dispatch] = useContext(ReduxContext);
  const { socket } = useContext(SocketContext);
  const streamRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [captionError, setCaptionError] = useState(null);
  const activePanelRef = useRef(activePanel);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  const { localStream, connections, messages, name, roomID } = state;
  const { status: trackStatus, toggleTrack } = useTrackStatus(localStream);

  const captionsEnabled = Boolean(captionsOn && isConnected && trackStatus.audio);

  const {
    currentCaption,
    previousCaption,
    publishCaption,
    clearCurrentCaption,
    clearAllCaptions,
  } = useRoomCaptions({
    socket,
    roomID,
    senderId: socket?.id,
    senderName: name || "You",
    enabled: captionsOn,
  });

  const { supported: captionsSupported, status: captionStatus } = useCaptionTranscriber({
    enabled: captionsEnabled,
    localStream,
    maxUtteranceMs: 4000,
    onResult: ({ text, isFinal, detectedLanguage }) => {
      publishCaption({
        text,
        isFinal,
        detectedLanguage,
      });
    },
    onError: setCaptionError,
    onStart: () => setCaptionError(null),
    onEnd: () => {
      if (!captionsEnabled) {
        clearCurrentCaption();
      }
    },
  });

  useEffect(() => {
    if (!captionsOn) {
      clearAllCaptions();
      setCaptionError(null);
    }
  }, [captionsOn, clearAllCaptions]);

  useEffect(() => {
    if (!trackStatus.audio) {
      clearCurrentCaption();
    }
  }, [trackStatus.audio, clearCurrentCaption]);

  const panels = {
    chat: activePanel === "chat",
    participants: activePanel === "participants",
    translate: activePanel === "translate",
    captions: captionsOn,
  };

  const onTogglePanel = useCallback(
    (key) => {
      if (key === "captions") {
        if (!captionsSupported) return;
        setCaptionsOn((prev) => !prev);
        return;
      }
      if (key === "chat") setUnreadCount(0);
      setActivePanel((prev) => (prev === key ? null : key));
    },
    [captionsSupported]
  );

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
        },
      })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        dispatch({ type: "SET_LOCAL_STREAM", payload: stream });
      })
      .catch((err) => {
        console.error("Camera/microphone access denied:", err);
      });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!socket) return;
    const currentSocket = socket;
    const handler = (msg) => {
      const isMe = msg.senderId === currentSocket.id;
      dispatch({ type: "ADD_MESSAGE", payload: { ...msg, me: isMe } });
      if (!isMe && activePanelRef.current !== "chat") setUnreadCount((c) => c + 1);
    };
    currentSocket.on("receive_message", handler);
    return () => currentSocket.off("receive_message", handler);
  }, [socket, dispatch]);

  const handleSendMessage = useCallback(
    (text) => {
      if (!socket || !roomID) return;
      const msg = {
        id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: socket.id,
        senderName: name || "You",
        text,
        timestamp: Date.now(),
      };
      socket.emit("send_message", { roomID, message: msg });
    },
    [socket, roomID, name]
  );

  const participantList = Object.values(connections).map((conn) => ({
    id: conn.peer,
    name: conn.peer?.slice(-4)?.toUpperCase() ?? "??",
    muted: !conn.remoteStream?.getAudioTracks?.()[0]?.enabled,
    stream: conn.remoteStream,
  }));

  const localUser = {
    id: "local",
    name: name ? `You (${name})` : "You",
    muted: !localStream?.getAudioTracks?.()[0]?.enabled,
    stream: localStream,
  };

  return (
    <div className="app-screen">
      {isConnected ? (
        <>
          <div className="app-main">
            <Room
              captionsOn={captionsOn}
              captionStatus={captionStatus}
              currentCaption={currentCaption}
              previousCaption={previousCaption}
            />
          </div>
          <SidePanel open={panels.chat}>
            <ChatPanel
              onClose={() => setActivePanel(null)}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </SidePanel>
          <SidePanel open={panels.participants}>
            <ParticipantsPanel
              onClose={() => setActivePanel(null)}
              participants={participantList}
              localUser={localUser}
            />
          </SidePanel>
          <SidePanel open={panels.translate}>
            <TranslatePanel onClose={() => setActivePanel(null)} />
          </SidePanel>
        </>
      ) : (
        <Preview setConnected={setConnected} />
      )}
      <Sidebar
        isPreview={!isConnected}
        panels={panels}
        onTogglePanel={onTogglePanel}
        messageCount={unreadCount}
        trackStatus={trackStatus}
        toggleTrack={toggleTrack}
        captionsSupported={captionsSupported}
        captionStatus={captionStatus}
        captionError={captionError}
      />
    </div>
  );
};
