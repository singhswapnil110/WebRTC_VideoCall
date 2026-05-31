import React, { useState, useEffect, useContext, useRef } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { Preview } from "./Preview";
import { Room } from "./Room";
import { Sidebar } from "./Sidebar";

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const dispatch = useContext(ReduxContext)[1];
  const streamRef = useRef(null);

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
    <div className="meeting-page">
      <Sidebar isPreview={!isConnected} />
      <div className="meeting-main-area">
        {isConnected ? (
          <Room />
        ) : (
          <Preview setConnected={setConnected} />
        )}
      </div>
    </div>
  );
};
