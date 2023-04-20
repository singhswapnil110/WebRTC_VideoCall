import React, { useState, useEffect, useContext } from "react";
import { ReduxContext } from "../store/reduxContextWrapper";
import { Preview } from "./Preview";
import { Room } from "./Room";
import { Sidebar } from "./Sidebar";

export const Meeting = () => {
  const [isConnected, setConnected] = useState(false);
  const dispatch = useContext(ReduxContext)[1];

  useEffect(() => {
    getUserVideo();
  }, []);

  const getUserVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        dispatch({ type: "SET_LOCAL_STREAM", payload: stream });
      });
  };

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
