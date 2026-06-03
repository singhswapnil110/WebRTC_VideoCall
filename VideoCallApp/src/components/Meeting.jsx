import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { Preview } from "./Preview";
import { Room } from "./Room";
import { Sidebar } from "./Sidebar";
import { ChatPanel, ParticipantsPanel, TranslatePanel } from "./SidePanel";

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const dispatch = useContext(ReduxContext)[1];
  const streamRef = useRef(null);

  const [activePanel, setActivePanel] = useState(null);
  const [captionsOn, setCaptionsOn] = useState(false);

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
  }, []);

  return (
    <div className="app-screen">
      {isConnected ? (
        <>
          <div className="app-main">
            <Room captionsOn={captionsOn} />
          </div>
          <ChatPanel open={panels.chat} onClose={() => setActivePanel(null)} />
          <ParticipantsPanel open={panels.participants} onClose={() => setActivePanel(null)} />
          <TranslatePanel open={panels.translate} onClose={() => setActivePanel(null)} />
        </>
      ) : (
        <Preview setConnected={setConnected} />
      )}
      <Sidebar isPreview={!isConnected} panels={panels} onTogglePanel={onTogglePanel} />
    </div>
  );
};
