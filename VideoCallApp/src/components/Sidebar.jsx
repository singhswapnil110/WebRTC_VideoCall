import React, { useEffect, useState, useContext } from "react";
import { IoVideocam } from "react-icons/io5";
import { HiMicrophone } from "react-icons/hi";
import { IoExitOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { ReduxContext } from "../store/reduxContextWrapper";

export const Sidebar = () => {
  const [trackStatus, setTrackStatus] = useState({
    video: true,
    audio: true,
  });
  const [state, dispatch] = useContext(ReduxContext);
  const { localStream } = state;
  const navigate = useNavigate();

  useEffect(() => {
    localStream?.getTracks().forEach((track) => {
      setTrackStatus({ ...trackStatus, [track.kind]: track.enabled });
    });
  }, []);

  const leaveRoom = () => {
    dispatch({ type: "LEAVE_ROOM" });
    navigate()("/");
  };

  const toggleTrack = (kind) => {
    localStream.getTracks().forEach((track) => {
      if (track.kind === kind) track.enabled = !track.enabled;
    });
    setTrackStatus({ ...trackStatus, [kind]: !trackStatus[kind] });
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <button
        className="m-2 text-2xl shadow-2xl"
        style={{ background: trackStatus.video ? "red" : "blue" }}
        onClick={() => toggleTrack("video")}
      >
        <IoVideocam />
      </button>
      <button
        className="m-2 text-2xl shadow-2xl"
        style={{ background: trackStatus.audio ? "red" : "blue" }}
        onClick={() => toggleTrack("audio")}
      >
        <HiMicrophone />
      </button>
      <button
        className="m-2 text-2xl shadow-2xl bg-red-700"
        onClick={leaveRoom}
      >
        <IoExitOutline />
      </button>
    </div>
  );
};
