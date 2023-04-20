import React, { useEffect, useRef } from "react";

export const VideoTile = ({ stream }) => {
  let videoRef = useRef();

  useEffect(() => {
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  }, [stream]);

  return (
    <div className="m-2 p-2 bg-gray-200 shadow-lg">
      <video ref={videoRef} className="rounded-xl" muted />
    </div>
  );
};
