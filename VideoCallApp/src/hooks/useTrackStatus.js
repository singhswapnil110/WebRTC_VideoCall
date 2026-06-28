import { useEffect, useState } from "react";

export function useTrackStatus(localStream) {
  const [status, setStatus] = useState({ video: false, audio: false });

  useEffect(() => {
    if (!localStream) {
      setStatus({ video: false, audio: false });
      return;
    }
    const update = () => {
      const next = { video: false, audio: false };
      localStream.getTracks().forEach((track) => {
        next[track.kind] = track.enabled;
      });
      setStatus(next);
    };
    update();
    localStream.getTracks().forEach((track) => {
      if (typeof track.addEventListener === "function") {
        track.addEventListener("ended", update);
        track.addEventListener("mute", update);
        track.addEventListener("unmute", update);
      }
    });
    return () => {
      localStream.getTracks().forEach((track) => {
        if (typeof track.removeEventListener === "function") {
          track.removeEventListener("ended", update);
          track.removeEventListener("mute", update);
          track.removeEventListener("unmute", update);
        }
      });
    };
  }, [localStream]);

  const toggleTrack = (kind) => {
    if (!localStream) return;
    localStream.getTracks().forEach((track) => {
      if (track.kind === kind) track.enabled = !track.enabled;
    });
    setStatus((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  return { status, toggleTrack };
}
