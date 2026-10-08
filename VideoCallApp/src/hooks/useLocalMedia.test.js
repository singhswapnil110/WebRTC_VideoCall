import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useLocalMedia } from "./useLocalMedia";

class FakeTrack extends EventTarget {
  constructor(kind, deviceId = `${kind}-1`) {
    super();
    this.kind = kind;
    this.deviceId = deviceId;
    this.enabled = true;
    this.stop = vi.fn();
  }
  getSettings() {
    return { deviceId: this.deviceId };
  }
}

class FakeStream {
  constructor(tracks = []) {
    this.tracks = [...tracks];
  }
  addTrack(track) {
    this.tracks.push(track);
  }
  getTracks() {
    return [...this.tracks];
  }
  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }
}

const device = (kind, deviceId) => ({ kind, deviceId, label: deviceId });

let mediaDevices;
let mic;
let camera;
let display;

const setup = async () => {
  const syncLocalStream = vi.fn();
  const replaceOutgoingTrack = vi.fn(async () => {});
  const hook = renderHook(() => useLocalMedia({ syncLocalStream, replaceOutgoingTrack }));
  await waitFor(() => expect(syncLocalStream).toHaveBeenCalledTimes(1));
  const current = () => syncLocalStream.mock.calls.at(-1)[0];
  return { ...hook, syncLocalStream, replaceOutgoingTrack, current };
};

const startShare = async (hook) => {
  act(() => hook.result.current.toggleScreenShare());
  await waitFor(() => expect(hook.current().getVideoTracks()[0]).toBe(display));
};

beforeEach(() => {
  mic = new FakeTrack("audio", "mic-1");
  camera = new FakeTrack("video", "cam-1");
  display = new FakeTrack("video", "screen");
  vi.stubGlobal("MediaStream", FakeStream);
  mediaDevices = {
    getUserMedia: vi.fn(async ({ audio, video }) =>
      new FakeStream([audio && mic, video && camera].filter(Boolean))
    ),
    getDisplayMedia: vi.fn(async () => new FakeStream([display])),
    enumerateDevices: vi.fn(async () => [
      device("audioinput", "default"),
      device("audioinput", "mic-1"),
      device("videoinput", "cam-1"),
      device("audiooutput", "default"),
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, "mediaDevices", { value: mediaDevices, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useLocalMedia screen share", () => {
  it("keeps the mic muted when the browser's Stop sharing ends the share", async () => {
    const hook = await setup();
    await startShare(hook);

    mic.enabled = false; // muted mid-share
    const restoredCamera = new FakeTrack("video", "cam-1");
    camera = restoredCamera;
    act(() => display.dispatchEvent(new Event("ended")));

    await waitFor(() => expect(hook.current().getVideoTracks()[0]).toBe(restoredCamera));
    expect(hook.current().getAudioTracks()[0]).toBe(mic);
    expect(mic.enabled).toBe(false);
    // Only the camera is reopened, on the selected device; the mic track is kept.
    expect(mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ video: { deviceId: { exact: "cam-1" } } });
    expect(hook.result.current.isScreenSharing).toBe(false);
  });

  it("shows the screen with the camera off, then restores the camera off", async () => {
    const hook = await setup();
    camera.enabled = false;

    await startShare(hook);
    expect(display.enabled).toBe(true);
    expect(camera.stop).toHaveBeenCalled();

    const restoredCamera = new FakeTrack("video", "cam-1");
    camera = restoredCamera;
    act(() => hook.result.current.toggleScreenShare());
    await waitFor(() => expect(hook.current().getVideoTracks()[0]).toBe(restoredCamera));
    expect(restoredCamera.enabled).toBe(false);
  });

  it("falls back to audio only and can share again when the camera cannot be restored", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const hook = await setup();
    await startShare(hook);

    mediaDevices.getUserMedia.mockRejectedValueOnce(new Error("NotReadableError"));
    act(() => hook.result.current.toggleScreenShare());

    await waitFor(() => expect(hook.current().getVideoTracks()).toEqual([]));
    expect(hook.current().getAudioTracks()[0]).toBe(mic);
    expect(display.stop).toHaveBeenCalled();
    expect(hook.result.current.isScreenSharing).toBe(false);
    expect(hook.replaceOutgoingTrack).toHaveBeenLastCalledWith("video", null);

    display = new FakeTrack("video", "screen-2");
    await startShare(hook);
    expect(hook.result.current.isScreenSharing).toBe(true);
  });

  it("opens one share picker for a double click", async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.toggleScreenShare();
      hook.result.current.toggleScreenShare();
    });
    await waitFor(() => expect(hook.result.current.isScreenSharing).toBe(true));
    await act(async () => {});
    expect(mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);
  });
});

describe("useLocalMedia devices", () => {
  it("selects the devices in use, falling back to Chrome's default output", async () => {
    const hook = await setup();
    await waitFor(() =>
      expect(hook.result.current.selectedDeviceIds).toEqual({
        audioinput: "mic-1",
        videoinput: "cam-1",
        audiooutput: "default",
      })
    );
  });

  it("switches only the camera and keeps the mic track", async () => {
    const hook = await setup();
    const nextCamera = new FakeTrack("video", "cam-2");
    camera = nextCamera;

    act(() => hook.result.current.selectDevice("videoinput", "cam-2"));

    await waitFor(() => expect(hook.current().getVideoTracks()[0]).toBe(nextCamera));
    expect(mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ video: { deviceId: { exact: "cam-2" } } });
    expect(hook.current().getAudioTracks()[0]).toBe(mic);
    expect(mic.stop).not.toHaveBeenCalled();
    expect(hook.result.current.selectedDeviceIds.videoinput).toBe("cam-2");
  });

  it("does nothing when the selected device is picked again", async () => {
    const hook = await setup();
    await waitFor(() => expect(hook.result.current.selectedDeviceIds.audioinput).toBe("mic-1"));
    mediaDevices.getUserMedia.mockClear();

    act(() => hook.result.current.selectDevice("audioinput", "mic-1"));
    await act(async () => {});

    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it("drops a device that was unplugged", async () => {
    const hook = await setup();
    await waitFor(() => expect(hook.result.current.selectedDeviceIds.videoinput).toBe("cam-1"));

    mediaDevices.enumerateDevices.mockResolvedValueOnce([device("audioinput", "mic-1")]);
    const onDeviceChange = mediaDevices.addEventListener.mock.calls.find(([event]) => event === "devicechange")[1];
    await act(async () => onDeviceChange());

    expect(hook.result.current.selectedDeviceIds.videoinput).toBe("");
  });
});
