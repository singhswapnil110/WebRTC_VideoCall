import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTrackStatus } from "./useTrackStatus";

const createTrack = (kind, enabled) => ({
  kind,
  enabled,
  addEventListener: () => {},
  removeEventListener: () => {},
});

const mockStream = (audioEnabled = true, videoEnabled = true) => {
  const tracks = [
    createTrack("audio", audioEnabled),
    createTrack("video", videoEnabled),
  ];
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  };
};

const mockPartialStream = ({ audio = null, video = null } = {}) => {
  const tracks = [];
  if (audio !== null) tracks.push(createTrack("audio", audio));
  if (video !== null) tracks.push(createTrack("video", video));
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

  it("defaults to both tracks off when stream is missing", () => {
    const { result } = renderHook(() => useTrackStatus(null));
    expect(result.current.status).toEqual({ audio: false, video: false });
  });

  it("marks missing tracks as off", () => {
    const stream = mockPartialStream({ audio: true, video: null });
    const { result } = renderHook(() => useTrackStatus(stream));
    expect(result.current.status).toEqual({ audio: true, video: false });
  });

  it("resets to both tracks off when stream is removed", () => {
    const stream = mockStream(true, true);
    const { result, rerender } = renderHook(({ currentStream }) => useTrackStatus(currentStream), {
      initialProps: { currentStream: stream },
    });
    expect(result.current.status).toEqual({ audio: true, video: true });
    rerender({ currentStream: null });
    expect(result.current.status).toEqual({ audio: false, video: false });
  });

  it("toggles tracks", () => {
    const stream = mockStream(true, true);
    const { result } = renderHook(() => useTrackStatus(stream));
    act(() => result.current.toggleTrack("audio"));
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
    expect(result.current.status.audio).toBe(false);
  });
});
