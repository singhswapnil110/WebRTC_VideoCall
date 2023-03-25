import React, { useContext } from "react";
import { ReduxContext } from "../store/reduxContextWrapper";
import { VideoTile } from "./VideoTile";

export const Room = () => {
  const { connections, localStream } = useContext(ReduxContext)[0];
  console.log("rerender Room");
  return (
    <div className="h-full bg-white grid grid-rows-2 grid-cols-2 items-center">
      <VideoTile stream={localStream} />
      {Object.values(connections).map((conn, index) => (
        <VideoTile key={index} stream={conn.remoteStream} />
      ))}
    </div>
  );
};
