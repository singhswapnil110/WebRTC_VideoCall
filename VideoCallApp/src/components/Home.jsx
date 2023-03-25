import React from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const Home = () => {
  const navigate = useNavigate();

  const navigateToRoom = (roomID) => {
    roomID ||= uuidv4();
    console.log(roomID);
    navigate(`/room/${roomID}`);
  };

  return (
    <div className="h-full w-full flex flex-row text-gray-500 bg-slate-200 ">
      <div className="h-full w-1/2 flex items-center justify-center">
        <button
          className="bg-green-400 text-white w-60 h-16"
          onClick={() => navigateToRoom()}
        >
          Create Room
        </button>
      </div>
      <div className="h-full w-1/2 flex flex-col items-center justify-center">
        <input className="bg-transparent border-b-2 border-red-900 m-4 w-72 h-96" />
        <button className="bg-red-600 text-white m-4 w-60">Join Room</button>
      </div>
    </div>
  );
};
