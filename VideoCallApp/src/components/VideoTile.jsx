import React, { useEffect, useRef } from "react";

export const VideoTile = ({ stream, isLocal = false, sinkId = "" }) => {
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

  useEffect(() => {
    const el = videoRef.current;
    if (!el || isLocal || !sinkId || typeof el.setSinkId !== "function") return;
    el.setSinkId(sinkId).catch(() => {});
  }, [isLocal, sinkId]);

  return (
    <video
      ref={videoRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      autoPlay
      muted={isLocal}
      playsInline
    />
  );
};
