import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { Preview } from "./Preview";
import { Room } from "./Room";
import { Sidebar } from "./Sidebar";
import { ChatPanel, ParticipantsPanel, TranslatePanel } from "./SidePanel";

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const [state, dispatch] = useContext(ReduxContext);
  const { socket } = useContext(SocketContext);
  const streamRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);
  const [captionsOn, setCaptionsOn] = useState(false);

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
    const handler = (msg) => {
      dispatch({ type: "ADD_MESSAGE", payload: msg });
    };
    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, [socket, dispatch]);

  const handleSendMessage = useCallback(
    (text) => {
      if (!socket || !state.roomID) return;
      const msg = {
        id: Date.now().toString(),
        senderId: socket.id,
        senderName: name || "You",
        text,
        timestamp: Date.now(),
        me: true,
      };
      dispatch({ type: "ADD_MESSAGE", payload: msg });
      socket.emit("send_message", { roomID: state.roomID, message: msg });
    },
    [socket, state.roomID, name, dispatch]
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
            <Room captionsOn={captionsOn} />
          </div>
          <ChatPanel
            open={panels.chat}
            onClose={() => setActivePanel(null)}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
          <ParticipantsPanel
            open={panels.participants}
            onClose={() => setActivePanel(null)}
            participants={participantList}
            localUser={localUser}
          />
          <TranslatePanel open={panels.translate} onClose={() => setActivePanel(null)} />
        </>
      ) : (
        <Preview setConnected={setConnected} />
      )}
      <Sidebar isPreview={!isConnected} panels={panels} onTogglePanel={onTogglePanel} messageCount={messages.length} />
    </div>
  );
};
