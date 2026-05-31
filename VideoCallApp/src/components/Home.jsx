import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const Home = () => {
  const navigate = useNavigate();
  const inputRef = useRef();

  const navigateToRoom = (roomID) => {
    roomID ||= uuidv4();
    navigate(`/room/${roomID}`);
  };

  return (
    <div className="h-full w-full flex flex-wrap bg-white">
      <div className="w-full h-1/2 flex flex-col items-center justify-evenly">
        <h1 className="font-extrabold text-transparent text-8xl bg-clip-text bg-gradient-to-r from-violet-800 to-pink-400">
          Sum वाद
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
        <form onSubmit={(e) => { e.preventDefault(); navigateToRoom(inputRef.current.value.trim()); }}>
          <input
            ref={inputRef}
            required
            className="bg-transparent border-b-2 border-red-900 m-4 w-96 text-2xl p-4"
          />
          <button type="submit" className="bg-white text-violet-900 m-4 w-60">
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};
