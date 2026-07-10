import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { SOCKET_EVENTS } from "../redux/socketEvents";
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
  const activePanelRef = useRef(activePanel);
  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  const { localStream, connections, messages, name } = state;

  const panels = {
    chat: activePanel === "chat",
    participants: activePanel === "participants",
    translate: activePanel === "translate",
    captions: captionsOn,
  };

  const onTogglePanel = useCallback((key) => {
    if (key === "captions") {
      setCaptionsOn((prev) => !prev);
      return;
    }
    if (key === "chat") setUnreadCount(0);
    setActivePanel((prev) => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
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
    currentSocket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handler);
    return () => currentSocket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handler);
  }, [socket, dispatch]);

  const handleSendMessage = useCallback(
    (text) => {
      if (!socket || !state.roomID) return;
      const msg = {
        id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: socket.id,
        senderName: name || "You",
        text,
        timestamp: Date.now(),
      };
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { roomID: state.roomID, message: msg });
    },
    [socket, state.roomID, name]
  );

  const participantList = Object.values(connections).map((conn) => ({
    id: conn.peer,
    name: conn.name || conn.peer?.slice(-4)?.toUpperCase() || "??",
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
            <Room captionsOn={captionsOn} />
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
      <Sidebar isPreview={!isConnected} panels={panels} onTogglePanel={onTogglePanel} messageCount={unreadCount} />
    </div>
  );
};
