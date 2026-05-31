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
    <div className="h-full w-full flex flex-col items-center bg-orange-50 box-border">
      <div className="w-full h-24 flex grow bg-black">
        {isConnected ? <Room /> : <Preview setConnected={setConnected} />}
      </div>
      <div className="w-full h-24 bg-silver-400">
        <Sidebar />
      </div>
    </div>
  );
};
