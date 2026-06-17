import React, { useEffect, useRef } from "react";

export const VideoTile = ({ stream }) => {
  const videoRef = useRef();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream) {
      el.pause();
      el.srcObject = null;
      return;
    }
    el.srcObject = stream;
    return () => {
      el.pause();
      el.srcObject = null;
    };
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
