import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTrackStatus } from "./useTrackStatus";

const mockStream = (audioEnabled = true, videoEnabled = true) => {
  const tracks = [
    { kind: "audio", enabled: audioEnabled },
    { kind: "video", enabled: videoEnabled },
  ];
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  };
};

describe("useTrackStatus", () => {
  it("reflects enabled track state", () => {
    const stream = mockStream(true, false);
    const { result } = renderHook(() => useTrackStatus(stream));
    expect(result.current.status).toEqual({ audio: true, video: false });
  });

  it("toggles tracks", () => {
    const stream = mockStream(true, true);
    const { result } = renderHook(() => useTrackStatus(stream));
    act(() => result.current.toggleTrack("audio"));
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
    expect(result.current.status.audio).toBe(false);
  });
});
