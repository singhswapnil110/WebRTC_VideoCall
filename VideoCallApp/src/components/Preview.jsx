import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { VideoTile } from "./VideoTile";

export const Preview = ({ setConnected }) => {
  const { roomID } = useParams();
  const state = useContext(ReduxContext)[0];
  const { joinRoomFunc, peerReady } = useContext(SocketContext);
  const { localStream } = state;
  const [name, setName] = useState("");

  const joinRoom = () => {
    joinRoomFunc(roomID);
    setConnected(true);
  };

  return (
    <div className="w-full h-full flex flex-col sm:flex-row bg-slate-50">
      <section className="sm:w-1/2 sm:h-full w-full h-1/2 flex flex-col justify-center items-center bg-silver-600 p-12">
        <VideoTile stream={localStream} />
      </section>
      <section className="sm:w-1/2 sm:h-full w-full h-1/2  flex flex-col justify-evenly items-center">

        <div className="flex flex-col h-2/3 justify-center">
          <input
            className="bg-transparent text-black text-2xl border-b-2 border-red-900 m-4 w-72"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="m-2 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={joinRoom}
            disabled={!localStream || !peerReady || !name.trim()}
          >
            Join Meeting
          </button>
        </div>
      </section>
    </div>
  );
};
