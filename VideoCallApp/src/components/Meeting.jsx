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
    <div className="h-full w-full flex flex-col sm:flex-row items-center">
      <div className="sm:w-11/12 sm:h-full w-full h-11/12">
        {isConnected ? <Room /> : <Preview setConnected={setConnected} />}
      </div>
      <div className="sm:w-1/12 sm:h-full w-full h-1/12 ">
        <Sidebar />
      </div>
    </div>
  );
};
