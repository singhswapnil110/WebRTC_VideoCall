import React, { useContext } from "react";
import { ReduxContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";

const gridLayout = (length) => {
  for (let i = 1; i < 6; i++)
    for (let j = i; j <= i + 1; j++)
      if (i * j >= length) return { rows: i, columns: j };
  return { rows: 5, columns: 6 };
};

export const Room = () => {
  const { connections, localStream } = useContext(ReduxContext)[0];
  const { rows, columns } = gridLayout(Object.keys(connections).length + 1);
  return (
    <div
      className="h-full w-full grid items-center justify-center bg-white"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      <VideoTile stream={localStream} />
      {Object.values(connections).map((conn) => (
        <VideoTile key={conn.peer} stream={conn.remoteStream} />
      ))}
    </div>
  );
};
