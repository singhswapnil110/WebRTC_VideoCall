import React, { useEffect, useState, useContext } from "react";
import { HiMicrophone } from "react-icons/hi";
import { TbScreenShare } from "react-icons/tb";
import {
  IoExitOutline,
  IoCopyOutline,
  IoVideocam,
  IoChatboxOutline,
} from "react-icons/io5";
import { ReduxContext, SocketContext } from "../store/reduxContextWrapper";
import { useNavigate } from "react-router-dom";

export const Sidebar = () => {
  const [trackStatus, setTrackStatus] = useState({
    video: true,
    audio: true,
  });
  const [state, dispatch] = useContext(ReduxContext);
  const { leaveRoomFunc } = useContext(SocketContext);
  const { localStream, roomID } = state;
  const navigate = useNavigate();

  useEffect(() => {
    localStream?.getTracks().forEach((track) => {
      setTrackStatus({ ...trackStatus, [track.kind]: track.enabled });
    });
  }, []);

  const leaveRoom = () => {
    leaveRoomFunc("Hello");
    navigate("/");
  };

  const toggleTrack = (kind) => {
    localStream.getTracks().forEach((track) => {
      if (track.kind === kind) track.enabled = !track.enabled;
    });
    setTrackStatus({ ...trackStatus, [kind]: !trackStatus[kind] });
  };

  const copyRoomLink = () => {
    const roomLink = `http://localhost:5173/room/${roomID}`;
    navigator.clipboard.writeText(roomLink);
  };

  return (
    <div className="h-full w-full flex flex-row justify-between items-center text-white">
      <div className="">
        <button
          className="m-2 p-3 text-center text-3xl rounded-full shadow-2xl"
          onClick={copyRoomLink}
        >
          <IoCopyOutline />
        </button>
      </div>
      <div className="flex">
        <button
          className="m-2 p-4 text-1xl shadow-2xl rounded-full "
          style={{ background: trackStatus.video ? "red" : "" }}
          onClick={() => toggleTrack("video")}
        >
          <IoVideocam />
        </button>
        <button
          className="m-2 p-4 text-1xl shadow-4xl rounded-full "
          style={{ background: trackStatus.audio ? "red" : "" }}
          onClick={() => toggleTrack("audio")}
        >
          <HiMicrophone />
        </button>
      </div>
      <div className="flex">
        <button className="m-2 p-4 text-1xl shadow-2xl rounded-full ">
          <TbScreenShare />
        </button>
        <button className="m-2 p-4 text-1xl shadow-2xl rounded-full ">
          <IoChatboxOutline />
        </button>
        <button
          className="m-2 p-4 text-1xl shadow-2xl bg-red-700 rounded-full "
          onClick={leaveRoom}
        >
          <IoExitOutline />
        </button>
      </div>
    </div>
  );
};
