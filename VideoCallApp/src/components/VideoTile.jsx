import React, { useEffect, useRef } from "react";

export const VideoTile = ({ stream }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (!stream) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      autoPlay
      muted
      playsInline
    />
  );
};
