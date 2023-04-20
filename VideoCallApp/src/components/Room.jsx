import React, { useContext } from "react";
import { ReduxContext } from "../store/reduxContextWrapper";
import { VideoTile } from "./VideoTile";

const gridLayout = (length) => {
  for (let i = 1; i < 6; i++)
    for (let j = i; j <= i + 1; j++)
      if (i * j >= length)
        return {
          rows: i,
          columns: j,
        };
};

export const Room = () => {
  const { connections, localStream } = useContext(ReduxContext)[0];
  const { rows, columns } = gridLayout(Object.keys(connections).length + 1);
  return (
    <div
      className={`h-full w-full bg-white grid grid-cols-${columns} grid-rows-${rows} items-center justify-center`}
    >
      <VideoTile stream={localStream} />
      {Object.values(connections).map((conn, index) => (
        <VideoTile key={index} stream={conn.remoteStream} />
      ))}
    </div>
  );
};
