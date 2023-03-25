import React, { useEffect, useRef } from "react";

export const VideoTile = ({ stream }) => {
  let videoRef = useRef();

  useEffect(() => {
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  }, [stream]);

  console.log(stream);

  return (
    <div className="object-contain p-4 bg-gray-200 max-w-lg shadow-lg">
      <video ref={videoRef} muted className="rounded-xl" />
    </div>
  );
};
