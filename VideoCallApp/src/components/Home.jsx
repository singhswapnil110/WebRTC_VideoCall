import React, { useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { ReduxContext } from "../store/reduxContextWrapper";

export const Home = () => {
  const navigate = useNavigate();
  const dispatch = useContext(ReduxContext)[1];

  const navigateToRoom = (roomID) => {
    roomID ||= uuidv4();
    navigate(`/room/${roomID}`);
    dispatch({ type: "SET_ROOM", payload: roomID });
  };

  const inputRef = useRef();

  return (
    <div className="h-full w-full flex flex-wrap bg-gradient-to-tr from-gray-700 via-gray-900 to-black">
      <div className="w-full h-1/2 flex flex-col items-center justify-evenly ">
        <h1 className="font-extrabold text-transparent text-8xl bg-clip-text bg-gradient-to-r from-violet-800 to-pink-400">
          Video Meet
        </h1>
        <p className="text-2xl">
          Create or join meets with friends, family and colleagues
        </p>
      </div>
      <div className="h-1/2 w-1/2 flex items-center justify-center">
        <button
          className="bg-violet-900 text-white w-60 h-16"
          onClick={() => navigateToRoom()}
        >
          Create Room
        </button>
      </div>
      <div className="h-1/2 w-1/2 flex flex-col items-center justify-center">
        <input
          ref={inputRef}
          className="bg-transparent border-b-2 border-red-900 m-4 w-96 text-2xl p-4"
        />
        <button
          onClick={() => navigateToRoom(inputRef.current.value)}
          className="bg-white text-violet-900 m-4 w-60"
        >
          Join Room
        </button>
      </div>
    </div>
  );
};
