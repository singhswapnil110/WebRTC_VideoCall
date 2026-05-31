import React, { useEffect, useState, useContext } from "react";
import { HiMicrophone } from "react-icons/hi";
import { TbScreenShare } from "react-icons/tb";
import {
  IoExitOutline,
  IoCopyOutline,
  IoVideocam,
  IoChatboxOutline,
} from "react-icons/io5";
import { ReduxContext, SocketContext } from "../redux/reduxContextWrapper";
import { useNavigate } from "react-router-dom";

export const Sidebar = ({ isPreview }) => {
  const [trackStatus, setTrackStatus] = useState({ video: true, audio: true });
  const [state] = useContext(ReduxContext);
  const { leaveRoomFunc } = useContext(SocketContext);
  const { localStream, roomID } = state;
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStream) return;
    const status = {};
    localStream.getTracks().forEach((track) => {
      status[track.kind] = track.enabled;
    });
    setTrackStatus(status);
  }, [localStream]);

  const leaveRoom = () => {
    leaveRoomFunc();
    navigate("/");
  };

  const toggleTrack = (kind) => {
    localStream.getTracks().forEach((track) => {
      if (track.kind === kind) track.enabled = !track.enabled;
    });
    setTrackStatus((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard.writeText(roomLink).catch((err) => {
      console.error("Failed to copy room link:", err);
    });
  };

  return (
    <div className="sidebar-slot">
      <div className="sidebar-pill">
        <button
          className="sb-btn"
          data-tip="Copy link"
          onClick={copyRoomLink}
        >
          <IoCopyOutline size={18} />
        </button>

        <div className="sb-sep" />

        <button
          className={`sb-btn ${!trackStatus.video ? "off" : "active"}`}
          data-tip={trackStatus.video ? "Turn off camera" : "Turn on camera"}
          onClick={() => toggleTrack("video")}
          disabled={!localStream}
        >
          <IoVideocam size={18} />
        </button>

        <button
          className={`sb-btn ${!trackStatus.audio ? "off" : "active"}`}
          data-tip={trackStatus.audio ? "Mute" : "Unmute"}
          onClick={() => toggleTrack("audio")}
          disabled={!localStream}
        >
          <HiMicrophone size={18} />
        </button>

        <div className="sb-sep" />

        <button
          className="sb-btn"
          data-tip="Share screen"
          disabled={isPreview}
        >
          <TbScreenShare size={18} />
        </button>

        <button
          className="sb-btn"
          data-tip="Chat"
          disabled={isPreview}
        >
          <IoChatboxOutline size={18} />
        </button>

        <div className="sb-sep" />

        <button
          className="sb-btn danger"
          data-tip="Leave"
          onClick={leaveRoom}
          disabled={isPreview}
        >
          <IoExitOutline size={18} />
        </button>
      </div>
    </div>
  );
};
